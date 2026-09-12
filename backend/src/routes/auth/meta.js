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

// In-memory store for short-lived, one-time OAuth states.
// Maps state (string) -> { userId: string, createdAt: number }
const pendingOAuthStates = new Map();

// Periodic cleanup of expired states (> 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of pendingOAuthStates.entries()) {
        if (now - data.createdAt > 10 * 60 * 1000) {
            pendingOAuthStates.delete(state);
        }
    }
}, 5 * 60 * 1000).unref();

/**
 * POST /api/auth/meta/prepare
 * Generates a short-lived one-time OAuth state ticket bound to the authenticated user.
 * SECURITY: Prevents transmitting long-lived JWTs in popup URL query parameters.
 */
router.post('/prepare', requireAuth, (req, res) => {
    const state = crypto.randomBytes(24).toString('hex');
    pendingOAuthStates.set(state, {
        userId: req.user.id,
        createdAt: Date.now()
    });
    res.json({ state });
});

/**
 * GET /api/auth/meta/login
 * Redirect user to Meta OAuth dialog using the one-time state ticket.
 */
router.get('/login', (req, res) => {
    const { state } = req.query;
    if (!state || typeof state !== 'string' || !pendingOAuthStates.has(state)) {
        return res.status(401).send('Invalid or expired OAuth state. Please restart authorization.');
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
 * Handle Meta OAuth callback and exchange code for token, verifying one-time state.
 */
router.get('/callback', async (req, res) => {
    // SECURITY: `error` is attacker-controlled query input — never interpolate
    // it raw into HTML/JS.
    const { code, error, state } = req.query;

    if (!state || typeof state !== 'string' || !pendingOAuthStates.has(state)) {
        return res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'Invalid or expired OAuth session' }));
    }

    // Single-use: consume state immediately to prevent replay
    pendingOAuthStates.delete(state);

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

        // 3. Return token to frontend via postMessage
        res.send(postMessagePage({
            type: 'META_AUTH_SUCCESS',
            accessToken: longLivedToken
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
    // Prefer the X-Meta-Token header so the Meta user token never lands in
    // URLs (server logs, history). Query param kept for backward compat.
    const token = req.get('X-Meta-Token') || req.query.token;
    if (!token) return res.status(400).json({ message: 'Token required' });

    try {
        const pages = await metaApiService.getUserPages(token);
        res.json(pages);
    } catch (err) {
        res.status(500).json({ message: 'Failed to discover pages', error: err.message });
    }
});

module.exports = router;
