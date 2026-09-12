const express = require('express');
const router = express.Router();
const webhookTracker = require('../../utils/webhookTracker');
const messagingService = require('../../services/messagingService');
const settingsService = require('../../services/settingsService');

// GET /webhook/meta - Verification for Meta (FB/IG) Webhooks
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
        webhookTracker.logVerification('meta', ok, latencyMs);
        webhookTracker.trackEndpoint('meta', {
            success: ok,
            latencyMs,
            httpStatus: ok ? 200 : 403,
            error: ok ? null : 'Verify token mismatch'
        });
        if (ok) {
            console.log('✅ Meta Webhook Verified');
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }
    return res.status(400).json({ error: 'Missing hub.mode / hub.verify_token' });
});

// POST /webhook/meta - Handle incoming messages from FB/IG
router.post('/', async (req, res) => {
    const startedAt = Date.now();
    try {
        const body = req.body;
        webhookTracker.log('meta', body);

        if (body.object === 'page' || body.object === 'instagram') {
            for (const entry of body.entry) {
                const messaging = entry.messaging || (entry.changes && entry.changes[0]?.value?.messages ? [entry.changes[0].value] : []);

                for (const event of messaging) {
                    if (event.message && !event.message.is_echo) {
                        await messagingService.processMetaMessage(event, body.object, req.io);
                    } else if (event.read) {
                        await messagingService.handleReadReceipt(event, req.io);
                    } else if (event.delivery) {
                        await messagingService.handleDeliveryReceipt(event, req.io);
                    } else if (event.typing) {
                        await messagingService.handleTypingIndicator(event, req.io);
                    }
                }
            }
            webhookTracker.trackEndpoint('meta', {
                success: true,
                latencyMs: Date.now() - startedAt,
                httpStatus: 200
            });
            return res.status(200).send('EVENT_RECEIVED');
        } else {
            webhookTracker.logFailure('meta', {
                eventType: 'webhook.failed',
                error: 'Unsupported object type',
                httpStatus: 404,
                latencyMs: Date.now() - startedAt,
                body
            });
            webhookTracker.trackEndpoint('meta', {
                success: false,
                latencyMs: Date.now() - startedAt,
                httpStatus: 404,
                error: 'Unsupported object type'
            });
            return res.sendStatus(404);
        }
    } catch (err) {
        console.error('❌ Error processing Meta webhook:', err);
        // Sanitize: never echo raw provider payloads or secrets in error paths.
        webhookTracker.logFailure('meta', {
            eventType: 'webhook.failed',
            error: err.message,
            httpStatus: 500,
            latencyMs: Date.now() - startedAt
        });
        webhookTracker.trackEndpoint('meta', {
            success: false,
            latencyMs: Date.now() - startedAt,
            httpStatus: 500,
            error: err.message
        });
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
