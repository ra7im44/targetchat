const { BlockedIP } = require('../models');

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

    // Get Client IP
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    if (blockedIPsCache.has(clientIP)) {
        return res.status(403).json({
            message: 'Access Denied',
            error: 'Your IP address has been blocked due to suspicious activity.'
        });
    }

    next();
};

module.exports = { ipBlocker, refreshCache };
