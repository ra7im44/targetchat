const express = require('express');
const router = express.Router();
const metaApiService = require('../../services/metaApiService');
const { requireAuth } = require('../../middleware/auth');

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
    const { code, error } = req.query;

    if (error) {
        return res.send(`
            <script>
                window.opener.postMessage({ type: 'META_AUTH_ERROR', error: '${error}' }, '*');
                window.close();
            </script>
        `);
    }

    try {
        const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/meta/callback`;

        // 1. Get Short-lived User Token
        const shortLivedToken = await metaApiService.getUserAccessToken(code, redirectUri);

        // 2. Exchange for Long-lived (60 day) User Token
        const longLivedToken = await metaApiService.getLongLivedUserAccessToken(shortLivedToken);

        // 3. Return token to frontend via postMessage
        res.send(`
            <script>
                window.opener.postMessage({ 
                    type: 'META_AUTH_SUCCESS', 
                    accessToken: '${longLivedToken}' 
                }, '*');
                window.close();
            </script>
        `);
    } catch (err) {
        console.error('[MetaAuth] Callback failed:', err.message);
        res.send(`
            <script>
                window.opener.postMessage({ type: 'META_AUTH_ERROR', error: 'Authentication failed' }, '*');
                window.close();
            </script>
        `);
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
