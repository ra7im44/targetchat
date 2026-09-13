/**
 * Socket.io Redis adapter bootstrap.
 *
 * With multiple app workers (PM2 cluster mode or multiple containers), each
 * process has its own in-memory socket registry: `io.to(room).emit(...)` only
 * reaches sockets connected to the SAME process. The Redis adapter bridges
 * that — every emit is also published to Redis, so workers deliver each
 * other's events. Prerequisite for re-enabling `instances: 'max'` in
 * ecosystem.config.js.
 *
 * Behaviour:
 *  - Enabled with SOCKETIO_REDIS_ADAPTER=true (production default ON).
 *  - Uses the same Redis credentials as the email queue (REDIS_HOST/PORT/PASSWORD).
 *  - Requires TWO dedicated connections (pub + sub) — subscriber connections
 *    enter subscribe-only mode and cannot issue regular commands.
 *  - FAILOPEN: if Redis is unreachable at boot, the server keeps running with
 *    per-process state and logs a loud warning (single-worker setups are then
 *    unaffected). If Redis drops later, socket.io's adapter retries silently.
 *  - Errors on the helper connections are logged, never thrown, so a Redis
 *    outage cannot crash the app via the uncaughtException path.
 */

const { createClient } = require('redis');

// Lazy, guarded require: the package may legitimately be absent (fresh clone
// before `npm install`). The app must still boot in that case — we fail-open
// to single-process mode with a loud warning instead of crashing at require().
let createAdapter = null;
try {
  ({ createAdapter } = require('@socket.io/redis-adapter'));
} catch (err) {
  // handled in attachRedisAdapter
}

function redisEnabledForAdapter() {
  if (process.env.SOCKETIO_REDIS_ADAPTER === 'false') return false;
  if (process.env.SOCKETIO_REDIS_ADAPTER === 'true') return true;
  // Default: enabled in production, disabled in development (no local Redis
  // requirement for contributors running a single worker).
  return process.env.NODE_ENV === 'production';
}

/**
 * Attach the Redis adapter to a socket.io server.
 * @param {import('socket.io').Server} io
 * @returns {Promise<{enabled: boolean, pub?: object, sub?: object}>}
 */
async function attachRedisAdapter(io) {
  if (!createAdapter) {
    console.warn('[socket-adapter] ⚠️ @socket.io/redis-adapter is not installed. ' +
      'Run `npm install` in backend/. Running with per-process socket state — stay on ONE worker.');
    return { enabled: false };
  }

  if (!redisEnabledForAdapter()) {
    console.log('[socket-adapter] Disabled (SOCKETIO_REDIS_ADAPTER not enabled) — single-process mode.');
    return { enabled: false };
  }

  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  const opts = {
    password,
    // Adapter connections are critical-path for emits; reconnect aggressively.
    socket: {
      host,
      port,
      reconnectStrategy: (retries) => Math.min(retries * 200, 5000)
    }
  };

  let pub;
  let sub;
  try {
    pub = createClient(opts);
    sub = pub.duplicate();

    const errorHandler = (label) => (err) =>
      console.error(`[socket-adapter] Redis ${label} error: ${err.message}`);

    pub.on('error', errorHandler('pub'));
    sub.on('error', errorHandler('sub'));

    // Bound the initial connect: node-redis keeps retrying per reconnectStrategy,
    // so a down Redis must not hang app startup (fail-open, not fail-hang).
    const CONNECT_TIMEOUT_MS = parseInt(process.env.SOCKETIO_ADAPTER_CONNECT_TIMEOUT || '3000', 10);
    await Promise.race([
      Promise.all([pub.connect(), sub.connect()]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`connect timed out after ${CONNECT_TIMEOUT_MS}ms`)), CONNECT_TIMEOUT_MS)
      )
    ]);
    io.adapter(createAdapter(pub, sub));
    console.log(`[socket-adapter] ✅ Redis adapter attached (${host}:${port}) — multi-worker safe.`);
    return { enabled: true, pub, sub };
  } catch (err) {
    console.warn(`[socket-adapter] ⚠️ Could not attach Redis adapter (${err.message}). ` +
      'Running with per-process socket state — DO NOT scale beyond one worker until fixed.');
    // Tear down half-connected clients so we don't leak sockets.
    for (const c of [pub, sub]) {
      try { if (c && c.isOpen) await c.disconnect(); } catch { /* ignore */ }
    }
    return { enabled: false };
  }
}

/**
 * Close adapter connections during graceful shutdown.
 */
async function closeAdapterConnections({ pub, sub } = {}) {
  for (const c of [pub, sub]) {
    try { if (c && c.isOpen) await c.disconnect(); } catch { /* ignore */ }
  }
}

module.exports = { attachRedisAdapter, closeAdapterConnections };
