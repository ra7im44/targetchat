const express = require('express');
const router = express.Router();
const webhookTracker = require('../../utils/webhookTracker');
const messagingService = require('../../services/messagingService');
const settingsService = require('../../services/settingsService');
const { verifyMetaSignature } = require('../../utils/metaSignature');

// GET /webhook/whatsapp - Verification for WhatsApp Cloud API
router.get('/', async (req, res) => {
    const startedAt = Date.now();
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        let expectedToken = process.env.META_VERIFY_TOKEN || process.env.VERIFY_TOKEN;
        if (!expectedToken) {
            try {
                expectedToken = await settingsService.get('meta_verify_token', null)
                    || await settingsService.get('META_VERIFY_TOKEN', null);
            } catch (e) {
                // ignore
            }
        }
        const ok = mode === 'subscribe' && expectedToken && token === expectedToken;
        const latencyMs = Date.now() - startedAt;
        webhookTracker.logVerification('whatsapp', ok, latencyMs);
        webhookTracker.trackEndpoint('whatsapp', {
            success: ok,
            latencyMs,
            httpStatus: ok ? 200 : 403,
            error: ok ? null : 'Verify token mismatch'
        });
        if (ok) {
            console.log('✅ WhatsApp Webhook Verified');
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }
    return res.status(400).json({ error: 'Missing hub.mode / hub.verify_token' });
});

// POST /webhook/whatsapp - Handle incoming WhatsApp messages
router.post('/', async (req, res) => {
    const startedAt = Date.now();
    try {
        // SECURITY: verify the X-Hub-Signature-256 HMAC over the raw request body
        // before processing or logging anything. WhatsApp Cloud API signs with the
        // same Meta App Secret scheme as Facebook/Instagram.
        const appSecret = (await settingsService.get('FACEBOOK_APP_SECRET'))
            || (await settingsService.get('META_APP_SECRET'))
            || (await settingsService.get('meta_app_secret'))
            || process.env.FACEBOOK_APP_SECRET
            || process.env.META_APP_SECRET;

        if (!appSecret && process.env.NODE_ENV !== 'production') {
            // Dev aid only: verification stays fail-closed (no bypass). Configure
            // the secret in Admin Settings or env to test locally with validly
            // signed payloads.
            console.warn('[Dev] No Meta App Secret configured (FACEBOOK_APP_SECRET / META_APP_SECRET / admin settings). Webhook signature verification will REJECT all payloads until the secret is set.');
        }

        if (!verifyMetaSignature(req.rawBody, req.headers['x-hub-signature-256'], appSecret)) {
            console.warn('[Security] WhatsApp webhook rejected: missing or invalid X-Hub-Signature-256');
            webhookTracker.trackEndpoint('whatsapp', {
                success: false,
                latencyMs: Date.now() - startedAt,
                httpStatus: 401,
                error: 'Invalid webhook signature'
            });
            return res.status(401).send('Invalid signature');
        }

        const body = req.body;
        webhookTracker.log('whatsapp', body);

        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    const value = change.value;
                    if (value.messages) {
                        const contact = value.contacts && value.contacts[0] ? value.contacts[0] : null;
                        for (const message of value.messages) {
                            await messagingService.processWhatsAppMessage(message, value.metadata, contact, req.io);
                        }
                    } else if (value.statuses) {
                        // Forward status updates (sent/delivered/read) to MessagingService if needed
                        // For now, WA status updates are just logged
                        console.log('[DEBUG] WhatsApp Status update received:', value.statuses[0].status);
                    }
                }
            }
            webhookTracker.trackEndpoint('whatsapp', {
                success: true,
                latencyMs: Date.now() - startedAt,
                httpStatus: 200
            });
            return res.status(200).send('EVENT_RECEIVED');
        } else {
            webhookTracker.logFailure('whatsapp', {
                eventType: 'webhook.failed',
                error: 'Unsupported object type',
                httpStatus: 404,
                latencyMs: Date.now() - startedAt,
                body
            });
            webhookTracker.trackEndpoint('whatsapp', {
                success: false,
                latencyMs: Date.now() - startedAt,
                httpStatus: 404,
                error: 'Unsupported object type'
            });
            return res.sendStatus(404);
        }
    } catch (err) {
        console.error('❌ Error processing WhatsApp webhook:', err);
        webhookTracker.logFailure('whatsapp', {
            eventType: 'webhook.failed',
            error: err.message,
            httpStatus: 500,
            latencyMs: Date.now() - startedAt
        });
        webhookTracker.trackEndpoint('whatsapp', {
            success: false,
            latencyMs: Date.now() - startedAt,
            httpStatus: 500,
            error: err.message
        });
        res.sendStatus(500);
    }
});

module.exports = router;
