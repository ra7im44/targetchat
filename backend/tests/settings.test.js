'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const {
  startServer, api, registerVerifiedUser, promoteToAdmin, sqliteRun, sqliteQuery
} = require('./helpers/server');

let server;
let baseUrl;
let dbPath;
let admin;
let adminEmail;
let member;
let chatId;

const AUTH = () => ({ Authorization: `Bearer ${admin.token}` });

async function getSettings() {
  const { res, data } = await api(baseUrl, '/api/admin/settings', { token: admin.token });
  assert.equal(res.status, 200, `${JSON.stringify(data)}\n${server.output().slice(-3000)}`);
  return data;
}

async function setSettings(updates) {
  const { res, data } = await api(baseUrl, '/api/admin/settings', {
    method: 'PATCH', token: admin.token, body: updates
  });
  assert.equal(res.status, 200, JSON.stringify(data));
  return data;
}

async function enableFeature(key, enabled) {
  await setSettings({ [key]: enabled ? 'true' : 'false' });
}

before(async () => {
  server = await startServer();
  baseUrl = server.baseUrl;
  dbPath = server.dbPath;

  adminEmail = `settings-admin-${Date.now()}@example.com`;
  admin = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'Settings Admin', email: adminEmail
  });
  await promoteToAdmin(dbPath, adminEmail);

  member = await registerVerifiedUser(baseUrl, dbPath, {
    name: 'Settings Member', email: `settings-member-${Date.now()}@example.com`
  });

  const chat = await api(baseUrl, '/api/chat/create', {
    method: 'POST', token: admin.token, body: { title: 'Settings AI gate' }
  });
  assert.equal(chat.status, 200, JSON.stringify(chat.data));
  chatId = chat.data.id;
});

after(async () => {
  if (server) await server.stop();
});

test('admin settings are forbidden to non-admin users', async () => {
  const { status } = await api(baseUrl, '/api/admin/settings', { token: member.token });
  assert.equal(status, 403);
  const patch = await api(baseUrl, '/api/admin/settings', {
    method: 'PATCH', token: member.token, body: { app_name: 'Hacked' }
  });
  assert.equal(patch.status, 403);
});

test('stored secrets are never returned and blank saves preserve them', async () => {
  const saved = await setSettings({ smtp_pass: 'stored-secret-value' });
  assert.ok(saved.changed.includes('smtp_pass'));

  const data = await getSettings();
  const secret = data.email.find((s) => s.key === 'smtp_pass');
  assert.equal(secret.value, '');
  assert.equal(secret.hasValue, true);
  assert.equal(secret.secret, true);

  await setSettings({ smtp_pass: '' });
  const rows = await sqliteQuery(dbPath, 'SELECT value FROM settings WHERE key = ?', ['smtp_pass']);
  assert.equal(rows[0].value, 'stored-secret-value');

  const publicConfig = await api(baseUrl, '/api/settings/public');
  assert.equal(publicConfig.status, 200);
  assert.equal(publicConfig.data.smtp_pass, undefined);
  assert.equal(publicConfig.data.MOCK_BILLING_ENABLED, undefined);
});

test('validation rejects bad types/URLs and writes nothing', async () => {
  const before = await getSettings();
  const originalUrl = before.general.find((s) => s.key === 'app_url').value;

  const { status, data } = await api(baseUrl, '/api/admin/settings', {
    method: 'PATCH',
    token: admin.token,
    body: {
      app_url: 'https://valid-but-must-not-save.example',
      smtp_port: 'not-a-port',
      enable_file_upload: 'maybe'
    }
  });
  assert.equal(status, 400);
  assert.equal(data.error, 'validation_failed');
  assert.ok(data.errors.smtp_port);
  assert.ok(data.errors.enable_file_upload);

  const after = await getSettings();
  assert.equal(after.general.find((s) => s.key === 'app_url').value, originalUrl);
});

test('unknown and internal settings cannot be created or edited', async () => {
  const unknown = await api(baseUrl, '/api/admin/settings', {
    method: 'PATCH', token: admin.token, body: { totally_new_key: 'x' }
  });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.data.error, 'unknown_setting');

  // Simulate an immutable upload-ownership record created by the upload route.
  await sqliteRun(dbPath, `INSERT INTO settings
    (section, key, value, type, description, is_public, created_at, updated_at)
    VALUES ('upload_ownership', 'upload_ownership_test', '{"userId":1}', 'string', '', 0, datetime('now'), datetime('now'))`);

  const internal = await api(baseUrl, '/api/admin/settings', {
    method: 'PATCH', token: admin.token, body: { upload_ownership_test: '{"userId":999}' }
  });
  assert.equal(internal.status, 403);

  const listed = await getSettings();
  assert.equal(JSON.stringify(listed).includes('upload_ownership_test'), false);
});

test('optimistic concurrency rejects a stale save', async () => {
  const data = await getSettings();
  const appName = data.general.find((s) => s.key === 'app_name');
  assert.ok(appName.version);

  const stale = await api(baseUrl, '/api/admin/settings', {
    method: 'PATCH', token: admin.token,
    body: { app_name: 'Stale Write', __versions: { app_name: '2000-01-01T00:00:00.000Z' } }
  });
  assert.equal(stale.status, 400);
  assert.match(stale.data.errors.app_name, /changed since/i);

  const current = await getSettings();
  const version = current.general.find((s) => s.key === 'app_name').version;
  await setSettings({ app_name: 'Concurrent OK', __versions: { app_name: version } });
});

test('reset restores one section only and preserves secrets', async () => {
  await setSettings({ app_name: 'Reset Me', support_email: 'reset@example.com' });
  await setSettings({ smtp_pass: 'keep-this-secret' });

  const unconfirmed = await api(baseUrl, '/api/admin/settings/reset', {
    method: 'POST', token: admin.token, body: { section: 'general' }
  });
  assert.equal(unconfirmed.status, 400);

  const reset = await api(baseUrl, '/api/admin/settings/reset', {
    method: 'POST', token: admin.token, body: { section: 'general', confirm: true }
  });
  assert.equal(reset.status, 200);
  assert.ok(reset.data.reset.includes('app_name'));
  assert.ok(reset.data.preservedSecrets.length === 0);

  const data = await getSettings();
  assert.equal(data.general.find((s) => s.key === 'app_name').value, 'TargetChat');
  assert.equal(data.email.find((s) => s.key === 'smtp_pass').value, '');
  const rows = await sqliteQuery(dbPath, 'SELECT value FROM settings WHERE key = ?', ['smtp_pass']);
  assert.equal(rows[0].value, 'keep-this-secret');

  const unknown = await api(baseUrl, '/api/admin/settings/reset', {
    method: 'POST', token: admin.token, body: { section: 'nope', confirm: true }
  });
  assert.equal(unknown.status, 400);
});

test('registration setting is enforced by the auth API', async () => {
  await setSettings({ allow_registration: 'false' });
  const blocked = await api(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: { name: 'Blocked', email: `blocked-${Date.now()}@example.com`, password: 'Password123!' }
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.data.error, 'registration_disabled');

  await setSettings({ allow_registration: 'true' });
  const allowed = await api(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: { name: 'Allowed', email: `allowed-${Date.now()}@example.com`, password: 'Password123!' }
  });
  assert.equal(allowed.status, 200);
});

test('feature flags close their APIs, not just their UI', async () => {
  await enableFeature('enable_file_upload', false);
  const upload = await api(baseUrl, '/api/upload', {
    method: 'POST', token: member.token, form: new FormData()
  });
  assert.equal(upload.status, 403);
  assert.equal(upload.data.error, 'feature_disabled');
  await enableFeature('enable_file_upload', true);

  await enableFeature('enable_canned_responses', false);
  const canned = await api(baseUrl, '/api/canned-responses', { token: member.token });
  assert.equal(canned.status, 403);
  await enableFeature('enable_canned_responses', true);
  assert.equal((await api(baseUrl, '/api/canned-responses', { token: member.token })).status, 200);

  await enableFeature('enable_live_chat', false);
  const widget = await api(baseUrl, '/widget/public/anything/config');
  assert.equal(widget.status, 403);
  await enableFeature('enable_live_chat', true);
});

test('AI master switch blocks generation before any message is written', async () => {
  await setSettings({ ai_enabled: 'false' });
  const blocked = await api(baseUrl, '/api/chat/stream', {
    method: 'POST', token: admin.token, body: { chat_id: chatId, text: 'Hello' }
  });
  assert.equal(blocked.status, 503);
  assert.equal(blocked.data.error, 'ai_disabled');

  const status = await api(baseUrl, '/api/admin/settings/status', { token: admin.token });
  assert.equal(status.status, 200);
  assert.equal(status.data.ai.enabled, false);

  await setSettings({ ai_enabled: 'true' });

  const invalidProvider = await api(baseUrl, '/api/admin/settings', {
    method: 'PATCH', token: admin.token, body: { ai_provider: 'not-a-provider' }
  });
  assert.equal(invalidProvider.status, 400);
  assert.ok(invalidProvider.data.errors.ai_provider);

  const invalidModel = await api(baseUrl, '/api/admin/settings', {
    method: 'PATCH', token: admin.token, body: { ai_model: 'does-not-exist:1b' }
  });
  assert.equal(invalidModel.status, 200);
  const after = await getSettings();
  assert.equal(after.ai.find((s) => s.key === 'ai_model').value, 'does-not-exist:1b');
  await setSettings({ ai_model: 'qwen2.5:3b' });
});

test('JWT lifetime comes from the security setting', async () => {
  await setSettings({ jwt_expiry_hours: '2' });
  const login = await api(baseUrl, '/api/auth/login', {
    method: 'POST', body: { email: adminEmail, password: 'Password123!' }
  });
  assert.equal(login.status, 200);
  const decoded = jwt.decode(login.data.token);
  assert.equal(decoded.exp - decoded.iat, 2 * 60 * 60);
  await setSettings({ jwt_expiry_hours: '24' });
});

test('failed logins are throttled at the configured threshold', async () => {
  await setSettings({ max_login_attempts: '2' });
  for (let i = 0; i < 2; i += 1) {
    const attempt = await api(baseUrl, '/api/auth/login', {
      method: 'POST', body: { email: adminEmail, password: 'WrongPassword!' }
    });
    assert.equal(attempt.status, 400);
  }
  const blocked = await api(baseUrl, '/api/auth/login', {
    method: 'POST', body: { email: adminEmail, password: 'WrongPassword!' }
  });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.data.error, 'too_many_attempts');

  await setSettings({ max_login_attempts: '5' });
  const ok = await api(baseUrl, '/api/auth/login', {
    method: 'POST', body: { email: adminEmail, password: 'Password123!' }
  });
  assert.equal(ok.status, 200);
});

test('maintenance mode returns 503 for non-admin traffic and excludes admin routes', async () => {
  await setSettings({ maintenance_mode: 'true' });
  const blocked = await api(baseUrl, '/api/chat/list', { token: member.token });
  assert.equal(blocked.status, 503);
  const adminRoutes = await api(baseUrl, '/api/admin/settings', { token: admin.token });
  assert.equal(adminRoutes.status, 200);
  await setSettings({ maintenance_mode: 'false' });
  assert.equal((await api(baseUrl, '/api/chat/list', { token: member.token })).status, 200);
});

test('email test endpoint uses the configured console provider', async () => {
  const result = await api(baseUrl, '/api/admin/settings/email/test', {
    method: 'POST', token: admin.token, body: { to: 'delivery@example.com' }
  });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.ok, true);
  assert.equal(result.data.provider, 'console');

  const invalid = await api(baseUrl, '/api/admin/settings/email/test', {
    method: 'POST', token: admin.token, body: { to: 'not-an-email' }
  });
  assert.equal(invalid.status, 400);
});

test('status endpoint reports real provider state without secrets', async () => {
  const { status, data } = await api(baseUrl, '/api/admin/settings/status', { token: admin.token });
  assert.equal(status, 200);
  assert.equal(typeof data.ai.ok, 'boolean');
  assert.equal(data.email.provider, 'console');
  assert.equal(JSON.stringify(data).includes('smtp_pass'), false);
  assert.equal(JSON.stringify(data).includes('stored-secret-value'), false);
});
