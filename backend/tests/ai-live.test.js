'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  startServer, api, registerVerifiedUser, readSse
} = require('./helpers/server');

/**
 * LIVE integration tests against the real local Ollama instance.
 * They skip (not pass) when no model backend is reachable, so the suite is
 * honest on machines without Ollama.
 */
let server;
let baseUrl;
let dbPath;
let user;
let chatId;
let aiStatus;

async function postStream(token, text) {
  const res = await fetch(`${baseUrl}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  assert.equal(res.status, 200, `stream request failed: ${res.status}`);
  return readSse(res);
}

function summarize(events) {
  const deltas = events.filter((e) => e.event === 'delta').map((e) => e.data.text);
  const done = events.find((e) => e.event === 'done');
  const error = events.find((e) => e.event === 'error');
  return { deltas, done: done && done.data, error: error ? error.data : null };
}

before(async () => {
  server = await startServer();
  baseUrl = server.baseUrl;
  dbPath = server.dbPath;

  user = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'Live AI', email: `live-ai-${Date.now()}@example.com`
  });

  const status = await api(baseUrl, '/api/ai/status?force=1', { token: user.token });
  aiStatus = status.data;

  if (aiStatus && aiStatus.reachable) {
    const chat = await api(baseUrl, '/api/chat/create', {
      method: 'POST', token: user.token, body: { title: 'Live AI test' }
    });
    chatId = chat.data.id;
  }
});

after(async () => {
  if (server) await server.stop();
});

test('LIVE: English message returns a real streamed model response', async (t) => {
  if (!aiStatus || !aiStatus.reachable || !chatId) {
    t.skip(`Ollama not reachable (${aiStatus && aiStatus.error && aiStatus.error.message})`);
    return;
  }

  const events = await postStream(user.token, 'Hello! What can you help me with?');
  const { deltas, done, error } = summarize(events);

  assert.equal(error, null, `stream error: ${JSON.stringify(error)}`);
  assert.ok(done, 'expected a done event');
  assert.ok(deltas.length >= 1, 'expected at least one incremental delta');
  assert.ok(done.text.trim().length > 0, 'expected non-empty generated text');
  assert.equal(done.provider, 'ollama');
  assert.equal(done.model, aiStatus.model);
  assert.ok(done.usage && done.usage.completionTokens > 0, 'real completion token count expected');
});

test('LIVE: Arabic message returns coherent Arabic output', async (t) => {
  if (!aiStatus || !aiStatus.reachable || !chatId) {
    t.skip('Ollama not reachable');
    return;
  }

  const events = await postStream(
    user.token,
    'أهلاً، ممكن تعرفني بنفسك وتقول لي تقدر تساعدني في إيه؟'
  );
  const { done, error } = summarize(events);

  assert.equal(error, null, JSON.stringify(error));
  assert.ok(done.text.trim().length > 0);
  assert.match(done.text, /[\u0600-\u06FF]/, 'expected Arabic characters in the reply');
});

test('LIVE: conversation memory is preserved across turns', async (t) => {
  if (!aiStatus || !aiStatus.reachable || !chatId) {
    t.skip('Ollama not reachable');
    return;
  }

  const first = summarize(await postStream(
    user.token,
    'My name is Ahmed and my favorite color is blue.'
  ));
  assert.equal(first.error, null);

  const second = summarize(await postStream(
    user.token,
    'What is my name and my favorite color? Answer in one short sentence.'
  ));
  assert.equal(second.error, null);
  assert.match(second.done.text, /ahmed/i, `name missing: ${second.done.text}`);
  assert.match(second.done.text, /blue/i, `color missing: ${second.done.text}`);
});

test('LIVE: streamed messages persist with real usage metadata', async (t) => {
  if (!aiStatus || !aiStatus.reachable || !chatId) {
    t.skip('Ollama not reachable');
    return;
  }

  const history = await api(baseUrl, `/api/chat/${chatId}/messages`, { token: user.token });
  assert.equal(history.status, 200);
  const messages = history.data.messages;
  assert.ok(messages.length >= 6, `expected persisted turns, got ${messages.length}`);

  const aiMessages = messages.filter((m) => m.sender === 'ai');
  const last = aiMessages[aiMessages.length - 1];
  assert.ok(last.metadata && last.metadata.ai, 'AI messages must carry provider metadata');
  assert.equal(last.metadata.ai.provider, 'ollama');
  assert.equal(last.metadata.ai.model, aiStatus.model);
  assert.equal(last.metadata.ai.fallback, false);
  assert.ok(last.metadata.ai.completionTokens > 0);
});

test('LIVE: another user cannot read this conversation', async (t) => {
  if (!chatId) {
    t.skip('No chat created');
    return;
  }
  const other = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'Intruder', email: `intruder-${Date.now()}@example.com`
  });
  const res = await api(baseUrl, `/api/chat/${chatId}/messages`, { token: other.token });
  assert.equal(res.status, 404);
});
