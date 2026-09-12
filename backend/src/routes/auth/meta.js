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
    return `<script>window.opener.postMessage(${JSON.stringify(payload)}, ${JSON.stringify(FRONTEND_ORIGIN)});window.close();</script>`;
}

/**
 * GET /api/auth/meta/login
 * Redirect user to Meta OAuth dialog
 */
router.get('/login', requireAuth, (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/meta/callback`;
    const scope = [
        'pages_messaging',
        'instagram_manage_messages',
        'pages_show_list',
        'pages_read_engagement',
        'business_management'
    ].join(',');

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;

    res.redirect(authUrl);
});

/**
 * GET /api/auth/meta/callback
 * Handle Meta OAuth callback and exchange code for token
 */
router.get('/callback', async (req, res) => {
    // SECURITY: `error` is attacker-controlled query input — never interpolate
    // it raw into HTML/JS.
    const { code, error } = req.query;

    if (error) {
        return res.send(postMessagePage({ type: 'META_AUTH_ERROR', error: 'Authentication failed' }));
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
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token required' });

    try {
        const pages = await metaApiService.getUserPages(token);
        res.json(pages);
    } catch (err) {
        res.status(500).json({ message: 'Failed to discover pages', error: err.message });
    }
});

module.exports = router;
