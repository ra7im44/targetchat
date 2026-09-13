const dns = require('dns').promises;
const net = require('net');

/**
 * SSRF guard for user-supplied webhook URLs.
 *
 * SECURITY: Workflows and channels accept webhook URLs from users and the
 * backend then POSTs payloads (including chat content and workspace data) to
 * them. Without validation a user can point a workflow at internal services
 * (localhost admin endpoints, the database, cloud metadata services) and
 * exfiltrate data or trigger internal state changes (Server-Side Request
 * Forgery).
 *
 * Policy:
 *  - Only http/https schemes are allowed.
 *  - By default, hostnames resolving to private/loopback/link-local ranges are
 *    REJECTED. Self-hosted deployments whose n8n lives on an internal network
 *    can relax this with BLOCK_PRIVATE_WEBHOOKS=false (the operator then owns
 *    the risk). Link-local metadata (169.254.169.254) stays blocked regardless.
 *  - DNS is resolved (short TTL cache) so literal-IP targets cannot be hidden
 *    behind a name. RESIDUAL RISK: axios resolves the hostname again at dial
 *    time, so a DNS-rebinding attack against an attacker-owned hostname has a
 *    small TOCTOU window this guard cannot close; full protection requires
 *    pinning the dial to the validated IP (breaks TLS SNI) or egress filtering.
 *  - IPv4-mapped IPv6 (::ffff:10.0.0.1) and IPv6 ULA/link-local are covered.
 */

const CACHE_TTL_MS = 60 * 1000;
const resolutionCache = new Map(); // hostname -> { addresses, expiresAt }

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/** Raw IP classification. Returns true when the IP must never be dialed. */
function isForbiddenIp(ip, { allowPrivate = false } = {}) {
  if (net.isIP(ip) === 0) return true; // not an IP -> refuse

  // Normalize IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) ip = mapped[1];

  if (net.isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    // Cloud metadata / link-local (always forbidden)
    if (a === 169 && b === 254) return true;
    if (allowPrivate) return false;
    if (a === 10) return true; // 10/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0/8 (this-host, includes 0.0.0.0)
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
    if (a >= 224) return true; // multicast/reserved
    return false;
  }

  // IPv6
  const v6 = ip.toLowerCase();
  if (v6 === '::' || v6 === '::1') return true; // unspecified / loopback
  if (v6.startsWith('fe80')) return true; // link-local (always forbidden)
  if (v6.startsWith('ff')) return true; // multicast
  if (allowPrivate) return false;
  if (v6.startsWith('fc') || v6.startsWith('fd')) return true; // ULA fc00::/7
  if (v6.startsWith('fec')) return true; // deprecated site-local
  return false;
}

async function resolveHost(hostname) {
  const cached = resolutionCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.addresses;

  // WHATWG URL keeps brackets on IPv6 literals (hostname === '[::1]'); strip
  // them so net.isIP classifies the address directly instead of failing DNS.
  const bareHost = hostname.replace(/^\[|\]$/g, '');

  let addresses;
  if (net.isIP(bareHost) > 0) {
    addresses = [bareHost]; // literal IP, no DNS needed
  } else {
    const results = await Promise.all([
      dns.resolve4(hostname).catch(() => []),
      dns.resolve6(hostname).catch(() => [])
    ]);
    addresses = [...results[0], ...results[1]];
    if (addresses.length === 0) {
      throw Object.assign(new Error(`Webhook host cannot be resolved: ${hostname}`), { code: 'UNSAFE_WEBHOOK_URL' });
    }
  }

  resolutionCache.set(hostname, { addresses, expiresAt: Date.now() + CACHE_TTL_MS });
  return addresses;
}

/**
 * Validate a webhook URL for outbound dispatch.
 * @param {string} rawUrl
 * @returns {Promise<string>} the validated URL (unchanged) — await before dialing.
 * @throws Error with .code === 'UNSAFE_WEBHOOK_URL' when the URL is not allowed.
 */
async function assertSafeWebhookUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw Object.assign(new Error('Webhook URL is required'), { code: 'UNSAFE_WEBHOOK_URL' });
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error('Webhook URL is not a valid URL'), { code: 'UNSAFE_WEBHOOK_URL' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw Object.assign(new Error('Webhook URL must use http or https'), { code: 'UNSAFE_WEBHOOK_URL' });
  }
  if (!parsed.hostname) {
    throw Object.assign(new Error('Webhook URL is missing a host'), { code: 'UNSAFE_WEBHOOK_URL' });
  }

  const allowPrivate = process.env.BLOCK_PRIVATE_WEBHOOKS === 'false';
  const addresses = await resolveHost(parsed.hostname);

  for (const ip of addresses) {
    if (isForbiddenIp(ip, { allowPrivate })) {
      throw Object.assign(
        new Error('Webhook URL points to a forbidden address (private, loopback, or metadata network). Set BLOCK_PRIVATE_WEBHOOKS=false only if you intentionally call internal services.'),
        { code: 'UNSAFE_WEBHOOK_URL' }
      );
    }
  }

  return rawUrl;
}

module.exports = { assertSafeWebhookUrl, isForbiddenIp };
