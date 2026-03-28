const express = require('express');
const router = express.Router();
const webhookTracker = require('../../utils/webhookTracker');
const messagingService = require('../../services/messagingService');

// GET /webhook/whatsapp - Verification for WhatsApp Cloud API
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
            console.log('✅ WhatsApp Webhook Verified');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
});

// POST /webhook/whatsapp - Handle incoming WhatsApp messages
router.post('/', async (req, res) => {
    try {
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
            return res.status(200).send('EVENT_RECEIVED');
        } else {
            return res.sendStatus(404);
        }
    } catch (err) {
        console.error('❌ Error processing WhatsApp webhook:', err);
        res.sendStatus(500);
    }
});

module.exports = router;
