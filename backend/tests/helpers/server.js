'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');

const ROOT = path.join(__dirname, '..', '..');

function sqliteRun(dbPath, sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) return reject(err);
    });
    db.run(sql, params, function onDone(err) {
      db.close();
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

async function promoteToAdmin(dbPath, email) {
  const result = await sqliteRun(dbPath, "UPDATE users SET role = 'admin' WHERE email = ?", [email]);
  if (!result.changes) throw new Error(`Could not promote ${email} to admin`);
}

function sqliteQuery(dbPath, sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
    });
    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Read a column whose name matches `pattern` (e.g. /verif/i) from a user row.
 * Avoids hardcoding snake_case vs camelCase field names.
 */
async function readUserColumn(dbPath, email, pattern) {
  const columns = await sqliteQuery(dbPath, 'PRAGMA table_info(users)');
  const names = columns.map((c) => c.name);
  // Prefer an exact match: /verif/i also matches the boolean `isVerified`.
  const exact = ['verificationToken', 'verification_token'];
  const column = exact.find((name) => names.includes(name))
    || names.find((name) => pattern.test(name));
  if (!column) throw new Error(`No user column matching ${pattern}`);
  const rows = await sqliteQuery(dbPath, `SELECT "${column}" AS value FROM users WHERE email = ?`, [email]);
  return rows.length ? rows[0].value : null;
}

function readVerificationToken(dbPath, email) {
  return readUserColumn(dbPath, email, /verification/i);
}

async function startServer(extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'targetchat-test-'));
  const dbPath = path.join(dir, 'test.sqlite');
  const port = 3500 + Math.floor(Math.random() * 1200);

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    DB_DIALECT: 'sqlite',
    DB_STORAGE: dbPath,
    DB_AUTO_MIGRATE: 'true',
    JWT_SECRET: `test-jwt-${'a'.repeat(48)}`,
    JWT_EXPIRES_IN: '1h',
    FILE_SIGN_SECRET: `test-file-${'b'.repeat(48)}`,
    WEBHOOK_SECRET: `test-hook-${'c'.repeat(48)}`,
    EMAIL_PROVIDER: 'console',
    SOCKETIO_REDIS_ADAPTER: 'false',
    AI_ALLOW_FALLBACK: 'false',
    ALLOW_MOCK_BILLING: 'false',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
    ...extraEnv
  };

  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (d) => { output += d.toString(); });
  child.stderr.on('data', (d) => { output += d.toString(); });

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited during startup (code ${child.exitCode}):\n${output}`);
    }
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) { ready = true; break; }
    } catch (e) { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) {
    child.kill('SIGKILL');
    throw new Error(`Server did not become healthy in time:\n${output}`);
  }

  return {
    baseUrl,
    dbPath,
    dir,
    child,
    output: () => output,
    async stop() {
      if (child.exitCode === null) {
        child.kill('SIGTERM');
        await new Promise((resolve) => {
          const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
          child.on('exit', () => { clearTimeout(timer); resolve(); });
        });
      }
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

async function api(baseUrl, pathname, { method = 'GET', token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${pathname}`, { method, headers, body: payload });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { res, status: res.status, data };
}

async function registerVerifiedUser(baseUrl, dbPath, { name, email, password = 'Password123!' }) {
  const reg = await api(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: { name, email, password }
  });
  if (reg.status !== 200) {
    throw new Error(`Registration failed (${reg.status}): ${JSON.stringify(reg.data)}`);
  }
  const token = await readVerificationToken(dbPath, email);
  if (!token) throw new Error('Verification token was not persisted');

  const verify = await api(baseUrl, '/api/auth/verify-email', {
    method: 'POST',
    body: { token }
  });
  if (verify.status !== 200 || !verify.data.token) {
    throw new Error(`Verification failed (${verify.status}): ${JSON.stringify(verify.data)}`);
  }
  return { token: verify.data.token, userId: null };
}

/**
 * Parse an SSE response body into ordered { event, data } frames.
 */
async function readSse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events = [];
  const parse = (frame) => {
    let event = 'message';
    const data = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trim());
    }
    if (!data.length) return;
    try {
      events.push({ event, data: JSON.parse(data.join('\n')) });
    } catch (e) { /* ignore */ }
  };
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      parse(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
  if (buffer.trim()) parse(buffer);
  return events;
}

module.exports = {
  startServer, api, registerVerifiedUser, readSse, sqliteRun, promoteToAdmin,
  sqliteQuery, readUserColumn, readVerificationToken, ROOT
};
