const express = require('express');
const router = express.Router();
const webhookTracker = require('../../utils/webhookTracker');
const messagingService = require('../../services/messagingService');

// GET /webhook/meta - Verification for Meta (FB/IG) Webhooks
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
            console.log('✅ Meta Webhook Verified');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
});

// POST /webhook/meta - Handle incoming messages from FB/IG
router.post('/', async (req, res) => {
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
            return res.status(200).send('EVENT_RECEIVED');
        } else {
            return res.sendStatus(404);
        }
    } catch (err) {
        console.error('❌ Error processing Meta webhook:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
