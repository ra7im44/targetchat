const express = require('express');
const router = express.Router();
const metaApiService = require('../../services/metaApiService');
const { requireAuth } = require('../../middleware/auth');

// SECURITY: postMessage target — never broadcast OAuth tokens to '*'.
const FRONTEND_ORIGIN = (() => {
    try {
        return new URL(process.env.FRONTEND_URL || 'http://localhost:3000').origin;
    } catch {
        return 'http://localhost:3000';
    }
})();

function postMessagePage(payload) {
    // JSON.stringify neutralises quote-breaking / reflected-XSS payloads.
    return `<script>if (window.opener) { window.opener.postMessage(${JSON.stringify(payload)}, ${JSON.stringify(FRONTEND_ORIGIN)}); } window.close();</script>`;
}

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../config/secrets');
const { Setting } = require('../../models');
const { Op } = require('sequelize');

/**
 * POST /api/auth/meta/prepare
 * Generates a stateless, tamper-proof state ticket bound to the authenticated user and a unique transaction ID (JTI).
 * SECURITY: Prevents transmitting long-lived JWTs in popup query strings and functions across PM2 cluster instances.
 */
router.post('/prepare', requireAuth, (req, res) => {
    const jti = crypto.randomBytes(16).toString('hex');
    const state = jwt.sign(
        { userId: req.user.id, purpose: 'meta_oauth', jti },
        getJwtSecret(),
        { expiresIn: '5m' }
    );
    res.json({ state, jti });
});

/**
 * GET /api/auth/meta/login
 * Redirect user to Meta OAuth dialog using the verified state ticket.
 */
router.get('/login', (req, res) => {
    const { state } = req.query;
    if (!state || typeof state !== 'string') {
        return res.status(401).send('Invalid or missing OAuth state. Please restart authorization.');
    }

    try {
        const decoded = jwt.verify(state, getJwtSecret());
        if (decoded.purpose !== 'meta_oauth' || !decoded.userId || !decoded.jti) {
            return res.status(401).send('Invalid state ticket.');
        }
    } catch (err) {
        return res.status(401).send('Expired or invalid OAuth state. Please restart authorization.');
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/meta/callback`;
    const scope = [
        'pages_messaging',
        'instagram_manage_messages',
        'pages_show_list',
        'pages_read_engagement',
        'business_management'
    ].join(',');

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${encodeURIComponent(state)}&response_type=code`;

    res.redirect(authUrl);
});

/**
 * GET /api/auth/meta/callback
 * Handle Meta OAuth callback and exchange code for token, verifying signed state and enforcing single-use.
 */
router.get('/callback', async (req, res) => {
    // SECURITY: `error` is attacker-controlled query input — never interpolate
    // it raw into HTML/JS.
    const { code, error, state } = req.query;

    if (!state || typeof state !== 'string') {
        return res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'Missing OAuth state' }));
    }

    let decoded;
    try {
        decoded = jwt.verify(state, getJwtSecret());
        if (decoded.purpose !== 'meta_oauth' || !decoded.userId || !decoded.jti) {
            return res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'Invalid OAuth state' }));
        }
    } catch (err) {
        return res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'Expired or invalid OAuth session' }));
    }

    // Atomic one-time consumption in shared DB across all PM2 cluster instances
    try {
        await Setting.create({
            section: 'oauth_consumed_jti',
            key: `oauth_jti_${decoded.jti}`,
            value: JSON.stringify({ userId: decoded.userId, consumedAt: new Date() }),
            isPublic: false
        });

        // Opportunistic asynchronous cleanup of consumed JTIs older than 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        Setting.destroy({
            where: {
                section: 'oauth_consumed_jti',
                created_at: { [Op.lt]: tenMinutesAgo }
            }
        }).catch((cleanupErr) => {
            console.error('[OAuth Security] Failed to cleanup expired JTIs:', cleanupErr.message);
        });
    } catch (dbErr) {
        if (dbErr.name === 'SequelizeUniqueConstraintError') {
            console.warn(`[OAuth Security] State replay detected for jti=${decoded.jti}`);
            return res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'OAuth state has already been consumed' }));
        }
        console.error('[OAuth Security] Database error during state consumption:', dbErr.message);
        return res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'Authentication processing failed' }));
    }

    if (error) {
        return res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'Authentication failed' }));
    }

    if (!code) {
        return res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'Missing authorization code' }));
    }

    try {
        const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/meta/callback`;

        // 1. Get Short-lived User Token
        const shortLivedToken = await metaApiService.getUserAccessToken(code, redirectUri);

        // 2. Exchange for Long-lived (60 day) User Token
        const longLivedToken = await metaApiService.getLongLivedUserAccessToken(shortLivedToken);

        // 3. Return token to frontend via postMessage bound to user and transaction
        res.send(postMessagePage({
            type: 'META_AUTH_SUCCESS',
            accessToken: longLivedToken,
            userId: decoded.userId,
            jti: decoded.jti
        }));
    } catch (err) {
        console.error('[MetaAuth] Callback failed:', err.message);
        res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'Authentication failed' }));
    }
});

/**
 * GET /api/auth/meta/discover
 * List all pages and IG accounts for a given user token
 */
router.get('/discover', requireAuth, async (req, res) => {
    // SECURITY: header-only. The Meta user token must never appear in a URL
    // (server logs, browser history, Referer). The previous req.query.token
    // fallback has been removed; the frontend already sends the header.
    const token = req.get('X-Meta-Token');
    if (!token) return res.status(400).json({ message: 'X-Meta-Token header required' });

    try {
        const pages = await metaApiService.getUserPages(token);
        res.json(pages);
    } catch (err) {
        res.status(500).json({ message: 'Failed to discover pages', error: err.message });
    }
});

module.exports = router;
