const { BlockedIP } = require('../models');
const { getClientIp } = require('../utils/requestContext');

// Simple in-memory cache to avoid DB hits on every request
// In a clustered environment, use Redis instead.
let blockedIPsCache = new Set();
let lastCacheUpdate = 0;
const CACHE_TTL = 30000; // 30 seconds

const refreshCache = async () => {
    try {
        const blocks = await BlockedIP.findAll({ attributes: ['ipAddress'] });
        blockedIPsCache = new Set(blocks.map(b => b.ipAddress));
        lastCacheUpdate = Date.now();
    } catch (err) {
        console.error('Error refreshing IP block list:', err);
    }
};

const ipBlocker = async (req, res, next) => {
    // Refresh cache if stale
    if (Date.now() - lastCacheUpdate > CACHE_TTL) {
        await refreshCache();
    }

    // SECURITY: use the central, trust-proxy-aware derivation. Reading raw
    // X-Forwarded-For here would let any client spoof a non-blocked address.
    const clientIP = getClientIp(req);

    if (blockedIPsCache.has(clientIP)) {
        return res.status(403).json({
            message: 'Access Denied',
            error: 'Your IP address has been blocked due to suspicious activity.'
        });
    }

    next();
};

module.exports = { ipBlocker, refreshCache };
