'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  startServer, api, registerVerifiedUser, readVerificationToken, sqliteQuery
} = require('./helpers/server');

let server;
let baseUrl;
let dbPath;

before(async () => {
  server = await startServer();
  baseUrl = server.baseUrl;
  dbPath = server.dbPath;
});

after(async () => {
  if (server) await server.stop();
});

test('health endpoint responds without leaking internals', async () => {
  const { res, data } = await api(baseUrl, '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(data, { status: 'ok' });
});

test('unknown API routes return structured JSON 404', async () => {
  const { res, data } = await api(baseUrl, '/api/definitely-not-a-route');
  assert.equal(res.status, 404);
  assert.equal(data.error, 'not_found');
});

test('fresh database is initialised with migrations and core tables', async () => {
  const tables = await sqliteQuery(dbPath, "SELECT name FROM sqlite_master WHERE type='table'");
  const names = tables.map((t) => t.name);
  for (const table of ['users', 'chats', 'messages', 'workspaces', 'schema_migrations', 'kb_documents', 'kb_chunks']) {
    assert.ok(names.includes(table), `expected table ${table}`);
  }
});

test('registration requires verification, then login works', async () => {
  const email = `verify-${Date.now()}@example.com`;
  const reg = await api(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: { name: 'Verify User', email, password: 'Password123!' }
  });
  assert.equal(reg.status, 200);
  assert.equal(reg.data.requireVerification, true);
  assert.equal(reg.data.token, undefined);

  const earlyLogin = await api(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: { email, password: 'Password123!' }
  });
  assert.equal(earlyLogin.status, 403);
  assert.equal(earlyLogin.data.requiresVerification, true);

  const verificationToken = await readVerificationToken(dbPath, email);
  assert.ok(verificationToken, 'verification token must be persisted');
  const verified = await api(baseUrl, '/api/auth/verify-email', {
    method: 'POST',
    body: { token: verificationToken }
  });
  assert.equal(verified.status, 200);
  const token = verified.data.token;
  assert.ok(token);

  const me = await api(baseUrl, '/api/auth/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, email);
});

test('unauthenticated access is rejected on protected routes', async () => {
  const { res, data } = await api(baseUrl, '/api/chat/list');
  assert.equal(res.status, 401);
  assert.equal(data.message, 'Unauthorized');
});

test('conversations are isolated between users', async () => {
  const stamp = Date.now();
  const alice = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'Alice', email: `alice-${stamp}@example.com`
  });
  const bob = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'Bob', email: `bob-${stamp}@example.com`
  });

  const created = await api(baseUrl, '/api/chat/create', {
    method: 'POST', token: alice.token, body: { title: 'Alice private chat' }
  });
  assert.equal(created.status, 200);
  const chatId = created.data.id;
  assert.ok(chatId);

  const bobRead = await api(baseUrl, `/api/chat/${chatId}/messages`, { token: bob.token });
  assert.equal(bobRead.status, 404);

  const bobSend = await api(baseUrl, '/api/chat/send', {
    method: 'POST',
    token: bob.token,
    body: { chat_id: chatId, message: { type: 'text', text: 'intrusion' } }
  });
  assert.equal(bobSend.status, 404);

  const bobList = await api(baseUrl, '/api/chat/list?workspace_id=all', { token: bob.token });
  assert.equal(bobList.status, 200);
  assert.equal(bobList.data.length, 0);

  const aliceList = await api(baseUrl, '/api/chat/list?workspace_id=all', { token: alice.token });
  assert.equal(aliceList.data.length, 1);
});

test('mock billing is disabled unless explicitly enabled', async () => {
  const user = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'Billing', email: `billing-${Date.now()}@example.com`
  });
  const { res, data } = await api(baseUrl, '/api/billing/mock-activate', {
    method: 'POST', token: user.token, body: { planId: 1 }
  });
  assert.equal(res.status, 403);
  assert.equal(data.error, 'mock_billing_disabled');
});

test('knowledge base ingests, retrieves and isolates workspaces', async () => {
  const stamp = Date.now();
  const owner = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'KB Owner', email: `kb-owner-${stamp}@example.com`
  });
  const outsider = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'KB Outsider', email: `kb-out-${stamp}@example.com`
  });

  const ws = await api(baseUrl, '/api/workspaces', {
    method: 'POST', token: owner.token, body: { name: `KB Workspace ${stamp}` }
  });
  assert.ok([200, 201].includes(ws.status), `workspace create failed: ${JSON.stringify(ws.data)}`);
  const workspaceId = (ws.data.workspace && ws.data.workspace.id) || ws.data.id;
  assert.ok(workspaceId);

  const documentBody = [
    'TargetChat refund policy: refunds are available within 14 days of purchase.',
    'Support hours are 09:00 to 17:00 Cairo time, Sunday to Thursday.',
    'The widget embeds with a single script tag and supports Arabic and English.'
  ].join('\n\n');

  const form = new FormData();
  form.append('workspace_id', String(workspaceId));
  form.append('title', 'Policy notes');
  form.append('file', new Blob([documentBody], { type: 'text/plain' }), 'policy-notes.txt');

  const upload = await api(baseUrl, '/api/knowledge/documents', {
    method: 'POST', token: owner.token, form
  });
  assert.equal(upload.status, 201, JSON.stringify(upload.data));
  assert.equal(upload.data.document.status, 'ready');
  assert.ok(upload.data.chunks >= 1);

  const search = await api(baseUrl, '/api/knowledge/search', {
    method: 'POST', token: owner.token,
    body: { workspace_id: workspaceId, query: 'How many days do I have for a refund?' }
  });
  assert.equal(search.status, 200);
  assert.ok(search.data.results.length >= 1);
  assert.match(search.data.results[0].text, /refund/i);

  const leaked = await api(baseUrl, '/api/knowledge/search', {
    method: 'POST', token: outsider.token,
    body: { workspace_id: workspaceId, query: 'refund' }
  });
  assert.equal(leaked.status, 404);

  const outsiderList = await api(baseUrl, `/api/knowledge/documents?workspace_id=${workspaceId}`, {
    token: outsider.token
  });
  assert.equal(outsiderList.status, 404);
});

test('AI status endpoint reports the effective local model', async () => {
  const user = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'AI Status', email: `ai-status-${Date.now()}@example.com`
  });
  const { res, data } = await api(baseUrl, '/api/ai/status', { token: user.token });
  assert.equal(res.status, 200);
  assert.equal(data.provider, 'ollama');
  assert.equal(data.configured, true);
  assert.ok(Array.isArray(data.models));
  assert.ok(data.fallbackEnabled === false);
});
