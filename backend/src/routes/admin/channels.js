const express = require('express');
const axios = require('axios');
const { Op } = require('sequelize');
const router = express.Router();
const { Channel, Message, Chat, User, ActivityLog } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const settingsService = require('../../services/settingsService');
const webhookTracker = require('../../utils/webhookTracker');

router.use(requireAuth, requireAdmin);

const META_GRAPH_VERSION = (() => {
    try {
        return require('../../services/metaApiService').META_GRAPH_VERSION || 'v19.0';
    } catch (e) {
        return 'v19.0';
    }
})();

// Actual public webhook routes mounted in src/index.js.
// Do NOT invent /api/webhooks/* — the real paths are /webhook/* and /api/webhook/n8n.
const WEBHOOK_DEFINITIONS = [
    { id: 'meta', name: 'Meta (FB/IG)', path: '/webhook/meta' },
    { id: 'whatsapp', name: 'WhatsApp Cloud', path: '/webhook/whatsapp' },
    { id: 'n8n', name: 'System Routing (n8n)', path: '/api/webhook/n8n' }
];

function hasValue(v) {
    return v !== null && v !== undefined && String(v).trim() !== '';
}

async function resolveFirstConfigured(keys) {
    for (const key of keys) {
        try {
            const v = await settingsService.get(key, null);
            if (hasValue(v)) return String(v);
        } catch (e) {
            // ignore and try next alias
        }
    }
    // Also check process.env directly if DB entry was empty or missing
    for (const key of keys) {
        const envVal = process.env[key] || process.env[key.toUpperCase()];
        if (hasValue(envVal)) return String(envVal);
    }
    return null;
}

function getBaseUrl() {
    const raw = process.env.BACKEND_URL
        || process.env.PUBLIC_BASE_URL
        || process.env.PUBLIC_URL
        || `http://localhost:${process.env.PORT || 3001}`;
    return String(raw).replace(/\/$/, '');
}

function isLocalhostUrl(url) {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.\d|172\.(1[6-9]|2\d|3[0-1])\./i.test(String(url));
}

function isHttpsUrl(url) {
    return /^https:\/\//i.test(String(url));
}

async function logAdminActivity(req, action, entityId, metadata) {
    try {
        await ActivityLog.create({
            userId: req.user ? req.user.id : null,
            action,
            entityType: 'channel',
            entityId: entityId !== undefined && entityId !== null ? String(entityId) : null,
            metadata: metadata || null,
            ipAddress: req.ip || null
        });
    } catch (err) {
        console.error('[AdminChannels] Failed to write activity log:', err.message);
    }
}

function toSafeProvider(channel, systemToken = null) {
    const json = channel.toJSON();
    const hasOwnToken = !!json.accessToken;
    const hasToken = hasOwnToken || (json.type === 'whatsapp' && hasValue(systemToken));
    // Normalized status derived from real DB state only.
    // No fake "degraded"/"expiring" states: without expiry/error signals we
    // report only what we can prove.
    let status = 'connected';
    if (!json.isActive) status = 'disconnected';
    else if (!hasToken) status = 'configuration_required';
    // Token state: expiry is not tracked in the DB, so a present token is
    // honestly reported as "unknown" rather than "healthy"/"100%".
    const tokenState = !hasToken ? 'not_configured' : 'unknown';
    return {
        id: json.id,
        provider: json.type,
        name: json.name,
        externalId: json.externalId,
        isActive: !!json.isActive,
        hasToken,
        status,
        tokenState,
        tokenExpiresAt: null,
        mode: json.mode,
        workflowUrl: json.workflowUrl || null,
        lastActiveAt: json.lastActiveAt || null,
        lastInboundAt: null,
        lastOutboundAt: null,
        lastHealthCheckAt: null,
        createdAt: json.createdAt || json.created_at || null,
        updatedAt: json.updatedAt || json.updated_at || null,
        owner: json.user ? { id: json.user.id, name: json.user.name, email: json.user.email } : null
    };
}

async function buildHealth() {
    const baseUrl = getBaseUrl();
    const localhost = isLocalhostUrl(baseUrl);
    const https = isHttpsUrl(baseUrl);

    const [metaAppId, metaAppSecret, verifyToken, whatsappPhoneNumberId, systemToken] = await Promise.all([
        resolveFirstConfigured(['FACEBOOK_APP_ID', 'META_APP_ID', 'meta_app_id']),
        resolveFirstConfigured(['FACEBOOK_APP_SECRET', 'META_APP_SECRET', 'meta_app_secret']),
        resolveFirstConfigured(['META_VERIFY_TOKEN', 'meta_verify_token', 'VERIFY_TOKEN']),
        resolveFirstConfigured(['WHATSAPP_PHONE_NUMBER_ID', 'whatsapp_phone_number_id']),
        resolveFirstConfigured(['META_SYSTEM_USER_TOKEN', 'WHATSAPP_TOKEN', 'WHATSAPP_ACCESS_TOKEN', 'META_WHATSAPP_TOKEN'])
    ]);

    const channels = await Channel.findAll({
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        order: [['created_at', 'DESC']]
    });
    const providers = channels.map((c) => toSafeProvider(c, systemToken));

    const fbChannels = providers.filter((p) => p.provider === 'facebook' || p.provider === 'instagram');
    const waChannels = providers.filter((p) => p.provider === 'whatsapp');
    const fbWithToken = fbChannels.filter((p) => p.hasToken).length;
    const waWithToken = waChannels.filter((p) => p.hasToken).length;

    const connectedChannels = providers.filter((p) => p.status === 'connected').length;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let messages24h = 0;
    try {
        messages24h = await Message.count({ where: { created_at: { [Op.gte]: since24h } } });
    } catch (e) {
        messages24h = await Message.count();
    }
    const failedEvents24h = webhookTracker.getFailures24h();
    const endpointStats = webhookTracker.getEndpointStats();

    const webhooks = WEBHOOK_DEFINITIONS.map((def) => {
        const stat = endpointStats[def.id] || {};
        return {
            id: def.id,
            name: def.name,
            path: def.path,
            url: `${baseUrl}${def.path}`,
            online: true,
            lastRequestAt: stat.lastRequestAt || null,
            lastSuccessAt: stat.lastSuccessAt || null,
            lastErrorAt: stat.lastErrorAt || null,
            lastError: stat.lastError || null,
            lastLatencyMs: typeof stat.lastLatencyMs === 'number' ? stat.lastLatencyMs : null,
            lastHttpStatus: typeof stat.lastHttpStatus === 'number' ? stat.lastHttpStatus : null,
            total: stat.total || 0,
            failures: stat.failures || 0
        };
    });

    // Token health is honest: without expiry metadata we report unknown,
    // never a fabricated 100%.
    let tokenHealthState = 'not_configured';
    if (providers.length === 0) tokenHealthState = 'not_configured';
    else if (providers.some((p) => !p.hasToken)) tokenHealthState = 'configuration_required';
    else tokenHealthState = 'unknown';

    const configuration = {
        metaAppId: { configured: hasValue(metaAppId), value: hasValue(metaAppId) ? String(metaAppId) : null },
        metaAppSecret: { configured: hasValue(metaAppSecret) },
        verifyToken: { configured: hasValue(verifyToken) },
        facebookInstagramToken: {
            configured: fbWithToken > 0,
            count: fbWithToken,
            total: fbChannels.length
        },
        whatsappToken: {
            configured: waWithToken > 0 || hasValue(systemToken),
            count: waWithToken,
            total: waChannels.length,
            systemTokenConfigured: hasValue(systemToken)
        },
        whatsappPhoneNumberId: {
            configured: hasValue(whatsappPhoneNumberId),
            value: hasValue(whatsappPhoneNumberId) ? String(whatsappPhoneNumberId) : null
        },
        publicWebhookUrl: {
            configured: !localhost && https,
            value: baseUrl,
            isLocalhost: localhost,
            isHttps: https
        },
        apiVersion: { value: META_GRAPH_VERSION }
    };

    const security = {
        signatureVerification: {
            enabled: false,
            label: 'Webhook Signature Verification',
            detail: 'Meta webhooks currently validate hub.verify_token only; X-Hub-Signature verification is not implemented.'
        },
        httpsTls: {
            enabled: https && !localhost,
            label: 'HTTPS / TLS Enabled',
            detail: https && !localhost ? `Public base URL uses HTTPS (${baseUrl}).` : `Base URL is ${baseUrl}; Meta requires a public HTTPS webhook URL.`
        },
        rateLimiting: {
            enabled: true,
            label: 'Rate Limiting',
            detail: 'Global 500/15m, auth 30/15m, upload 30/15m, chat 60/min (express-rate-limit).'
        },
        authProtection: {
            enabled: true,
            label: 'Authentication Protection',
            detail: 'Admin channel APIs require JWT authentication and the admin role.'
        },
        secretRedaction: {
            enabled: true,
            label: 'Secret Redaction',
            detail: 'Health and log APIs return booleans and redacted metadata only; tokens and secrets never leave the server.'
        }
    };

    const alerts = [];
    if (!hasValue(metaAppId) || !hasValue(metaAppSecret) || !hasValue(verifyToken)) {
        alerts.push({
            severity: 'warning',
            code: 'meta_incomplete',
            message: 'Meta configuration is incomplete. Set the App ID, App Secret, and Verify Token via server environment or Admin > Settings > Integrations.'
        });
    }
    if (localhost || !https) {
        alerts.push({
            severity: 'warning',
            code: 'webhook_url_localhost',
            message: `Public HTTPS webhook URL is not configured (current base URL is ${baseUrl}). Meta requires a public HTTPS endpoint; localhost only works for local development.`
        });
    }
    if (providers.length === 0) {
        alerts.push({
            severity: 'info',
            code: 'no_channels',
            message: 'No channels connected yet. Connect a Facebook Page, Instagram account, or WhatsApp number from the Channels page.'
        });
    } else if (providers.some((p) => !p.hasToken)) {
        alerts.push({
            severity: 'warning',
            code: 'channel_missing_token',
            message: 'One or more channels are missing an access token and cannot send or receive messages until configured.'
        });
    }
    if (failedEvents24h > 0) {
        alerts.push({
            severity: failedEvents24h >= 7 ? 'error' : 'warning',
            code: 'webhook_failures',
            message: `Webhook delivery has failed ${failedEvents24h} time(s) in the last 24 hours. Check Recent Logs for details.`
        });
    }

    const summary = {
        connectedChannels,
        totalChannels: providers.length,
        webhooksOnline: { online: webhooks.filter((w) => w.online).length, total: webhooks.length },
        messages24h,
        failedEvents24h,
        tokenHealth: {
            state: tokenHealthState,
            configured: providers.filter((p) => p.hasToken).length,
            total: providers.length
        }
    };

    return {
        summary,
        configuration,
        providers,
        webhooks,
        security,
        alerts,
        lastCheckedAt: new Date().toISOString()
    };
}

// GET /api/admin/channels/health - Sanitized operational health for Admin > Channels
router.get('/health', async (req, res) => {
    try {
        const health = await buildHealth();
        res.json(health);
    } catch (err) {
        console.error('Error building channel health:', err);
        res.status(500).json({ message: 'Failed to build channel health' });
    }
});

// GET /api/admin/channels/stats - Legacy alias kept for backward compatibility.
// Returns the same sanitized health payload plus legacy field aliases.
router.get('/stats', async (req, res) => {
    try {
        const health = await buildHealth();
        res.json({
            ...health,
            // Legacy aliases (no secrets; booleans only for tokens)
            totalChannels: health.summary.totalChannels,
            activeChannels: health.summary.connectedChannels,
            activeWebhooks: health.summary.webhooksOnline.online,
            healthyTokens: health.summary.tokenHealth.configured,
            messagesProcessed: health.summary.messages24h,
            config: {
                appId: health.configuration.metaAppId.configured ? health.configuration.metaAppId.value : 'Not Configured',
                verifyToken: health.configuration.verifyToken.configured ? 'Configured' : 'Not Configured',
                systemToken: health.configuration.whatsappToken.configured ? 'Configured' : 'Not Configured'
            }
        });
    } catch (err) {
        console.error('Error fetching channel stats:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/channels/logs - Sanitized webhook/channel event logs with filters
router.get('/logs', async (req, res) => {
    try {
        const { provider, status, direction, search, limit } = req.query;
        const logs = webhookTracker.getLogs({ provider, status, direction, search, limit });
        res.json({ logs, total: logs.length });
    } catch (err) {
        console.error('Error fetching channel logs:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/channels - System-wide sanitized channel list
router.get('/', async (req, res) => {
    try {
        const systemToken = await resolveFirstConfigured(['META_SYSTEM_USER_TOKEN', 'WHATSAPP_TOKEN', 'WHATSAPP_ACCESS_TOKEN', 'META_WHATSAPP_TOKEN']);
        const channels = await Channel.findAll({
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
            order: [['created_at', 'DESC']]
        });
        res.json(channels.map((c) => toSafeProvider(c, systemToken)));
    } catch (err) {
        console.error('Error fetching all channels:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/channels/webhooks/:provider/test - Safe endpoint check via loopback request
router.post('/webhooks/:provider/test', async (req, res) => {
    const startedAt = Date.now();
    try {
        const provider = String(req.params.provider || '').toLowerCase();
        const def = WEBHOOK_DEFINITIONS.find((w) => w.id === provider);
        if (!def) {
            return res.status(404).json({ ok: false, message: 'Unknown webhook endpoint' });
        }
        const baseUrl = getBaseUrl();
        const port = process.env.PORT || 3001;
        let isOnline = false;
        let latencyMs = null;
        let httpStatus = null;
        let lastError = null;

        try {
            const loopback = await axios.get(`http://127.0.0.1:${port}${def.path}`, {
                validateStatus: () => true,
                timeout: 4000
            });
            latencyMs = Date.now() - startedAt;
            httpStatus = loopback.status;
            // 2xx, 3xx, 4xx (e.g. 400 missing verify token) all confirm router is mounted and active
            isOnline = loopback.status !== 404 && loopback.status < 500;
            if (!isOnline) {
                lastError = `Endpoint returned HTTP ${loopback.status}`;
            }
        } catch (netErr) {
            latencyMs = Date.now() - startedAt;
            isOnline = false;
            lastError = netErr.message;
        }

        webhookTracker.trackEndpoint(def.id, {
            success: isOnline,
            latencyMs,
            httpStatus,
            error: isOnline ? null : lastError
        });

        await logAdminActivity(req, 'channel.webhook_test', def.id, { path: def.path, ok: isOnline, latencyMs, httpStatus });

        res.json({
            ok: isOnline,
            provider: def.id,
            name: def.name,
            url: `${baseUrl}${def.path}`,
            online: isOnline,
            latencyMs,
            httpStatus,
            lastRequestAt: new Date().toISOString(),
            lastSuccessAt: isOnline ? new Date().toISOString() : null,
            lastErrorAt: isOnline ? null : new Date().toISOString(),
            lastError: isOnline ? null : lastError,
            checkedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error testing webhook endpoint:', err);
        res.status(500).json({ ok: false, message: 'Webhook test failed' });
    }
});

// POST /api/admin/channels/:id/validate - Server-side provider token validation.
// The stored token never leaves the server; only a sanitized result is returned.
router.post('/:id/validate', async (req, res) => {
    const startedAt = Date.now();
    try {
        const channel = await Channel.findByPk(req.params.id);
        if (!channel) {
            return res.status(404).json({ ok: false, message: 'Channel not found' });
        }

        const systemToken = await resolveFirstConfigured(['META_SYSTEM_USER_TOKEN', 'WHATSAPP_TOKEN', 'WHATSAPP_ACCESS_TOKEN', 'META_WHATSAPP_TOKEN']);
        const tokenToUse = channel.accessToken || (channel.type === 'whatsapp' ? systemToken : null);

        if (!tokenToUse) {
            webhookTracker.record({
                provider: channel.type,
                direction: 'system',
                eventType: 'token.validation_failed',
                status: 'failed',
                latencyMs: Date.now() - startedAt,
                error: 'No access token configured'
            });
            await logAdminActivity(req, 'channel.token_validate', channel.id, { provider: channel.type, ok: false, reason: 'missing_token' });
            return res.status(400).json({ ok: false, message: 'No access token configured for this channel' });
        }

        let url;
        if (channel.type === 'whatsapp') {
            url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(channel.externalId)}?fields=display_phone_number,verified_name,quality_rating`;
        } else {
            url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(channel.externalId)}?fields=id,name,username`;
        }

        try {
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${tokenToUse}` },
                timeout: 8000
            });
            const data = response.data || {};
            const details = {
                id: data.id || channel.externalId,
                name: data.name || data.verified_name || data.username || channel.name
            };
            webhookTracker.record({
                provider: channel.type,
                direction: 'system',
                eventType: 'token.validated',
                status: 'success',
                httpStatus: 200,
                latencyMs: Date.now() - startedAt,
                messageId: null
            });
            await logAdminActivity(req, 'channel.token_validate', channel.id, { provider: channel.type, ok: true });
            return res.json({ ok: true, provider: channel.type, latencyMs: Date.now() - startedAt, details, checkedAt: new Date().toISOString() });
        } catch (apiErr) {
            const sanitized = apiErr.response?.data?.error?.message || apiErr.message || 'Provider validation failed';
            webhookTracker.record({
                provider: channel.type,
                direction: 'system',
                eventType: 'token.validation_failed',
                status: 'failed',
                httpStatus: apiErr.response?.status || null,
                latencyMs: Date.now() - startedAt,
                error: String(sanitized).slice(0, 300)
            });
            await logAdminActivity(req, 'channel.token_validate', channel.id, { provider: channel.type, ok: false });
            return res.status(502).json({ ok: false, message: String(sanitized).slice(0, 300), latencyMs: Date.now() - startedAt });
        }
    } catch (err) {
        console.error('Error validating channel token:', err);
        res.status(500).json({ ok: false, message: 'Validation failed' });
    }
});

// DELETE /api/admin/channels/:id - Disconnect a channel (admin scope).
// Message history is preserved; only the channel connection row is removed.
router.delete('/:id', async (req, res) => {
    try {
        const channel = await Channel.findByPk(req.params.id);
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }
        const snapshot = { id: channel.id, type: channel.type, name: channel.name, externalId: channel.externalId };
        // Decouple any chats referencing this channel so message history is preserved
        await Chat.update({ channelId: null }, { where: { channelId: channel.id } });
        await channel.destroy();
        await logAdminActivity(req, 'channel.disconnect', snapshot.id, snapshot);
        res.json({ message: 'Channel disconnected. Message history was preserved.' });
    } catch (err) {
        console.error('Error disconnecting channel:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
