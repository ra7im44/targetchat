/**
 * Central client-IP derivation.
 *
 * SECURITY: Express only trusts X-Forwarded-For when `app.set('trust proxy', ...)`
 * is configured. Every place that needs the client IP must go through this helper
 * so the whole app is consistent: trusting XFF without a proxy lets any client
 * spoof its address (defeating IP blocking, poisoning audit logs, and bypassing
 * rate limits keyed by IP).
 *
 * @param {object} req - Express request
 * @returns {string} best-effort client IP (may be 'unknown')
 */
function getClientIp(req) {
  if (!req) return 'unknown';

  // req.ip already honours the app's 'trust proxy' setting (undefined => only
  // the direct socket address is used, XFF ignored).
  let ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';

  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:203.0.113.7 -> 203.0.113.7) and
  // IPv6 loopback, so IP block-list entries and log lines are stable.
  if (ip === '::1') ip = '127.0.0.1';
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) ip = mapped[1];

  return ip;
}

module.exports = { getClientIp };
