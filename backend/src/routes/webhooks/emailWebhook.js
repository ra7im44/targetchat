const express = require('express');
const router = express.Router();
const { EmailLog } = require('../../models');

/**
 * Webhook handler for email delivery events
 * Supports SendGrid and AWS SES
 */

/**
 * POST /webhook/email/sendgrid
 * Handle SendGrid webhook events
 */
router.post('/sendgrid', express.json(), async (req, res) => {
    try {
        const events = req.body;

        // SendGrid sends an array of events
        if (!Array.isArray(events)) {
            return res.status(400).json({ message: 'Invalid payload format' });
        }

        console.log(`📧 Received ${events.length} SendGrid webhook events`);

        for (const event of events) {
            const { event: eventType, sg_message_id, email, timestamp } = event;

            // Find log by provider message ID
            const log = await EmailLog.findOne({
                where: { providerMessageId: sg_message_id }
            });

            if (!log) {
                console.warn(`⚠️  No log found for SendGrid message ID: ${sg_message_id}`);
                continue;
            }

            // Update log based on event type
            const updates = {};

            switch (eventType) {
                case 'delivered':
                    updates.status = 'delivered';
                    updates.deliveredAt = new Date(timestamp * 1000);
                    break;

                case 'open':
                    updates.status = 'opened';
                    updates.openedAt = new Date(timestamp * 1000);
                    break;

                case 'click':
                    updates.status = 'clicked';
                    break;

                case 'bounce':
                case 'dropped':
                    updates.status = 'bounced';
                    updates.errorMessage = event.reason || 'Email bounced';
                    break;

                case 'deferred':
                    // Temporary failure, keep as 'sent'
                    break;

                case 'spam_report':
                case 'unsubscribe':
                    // Log but don't change status
                    console.log(`📧 ${eventType} event for ${email}`);
                    break;

                default:
                    console.warn(`⚠️  Unknown SendGrid event type: ${eventType}`);
            }

            if (Object.keys(updates).length > 0) {
                await log.update(updates);
                console.log(`✅ Updated log ${log.id}: ${eventType}`);
            }
        }

        res.status(200).json({ received: events.length });
    } catch (error) {
        console.error('❌ SendGrid webhook error:', error);
        res.status(500).json({ message: 'Webhook processing failed', error: error.message });
    }
});

/**
 * POST /webhook/email/ses
 * Handle AWS SES webhook events (SNS notifications)
 */
router.post('/ses', express.json(), async (req, res) => {
    try {
        const { Type, Message } = req.body;

        // Handle SNS subscription confirmation
        if (Type === 'SubscriptionConfirmation') {
            console.log('📧 SNS Subscription Confirmation received');
            // In production, you'd confirm the subscription here
            return res.status(200).json({ message: 'Subscription confirmed' });
        }

        // Handle notification
        if (Type === 'Notification') {
            const message = JSON.parse(Message);
            const { notificationType, mail } = message;

            const messageId = mail.messageId;

            // Find log by provider message ID
            const log = await EmailLog.findOne({
                where: { providerMessageId: messageId }
            });

            if (!log) {
                console.warn(`⚠️  No log found for SES message ID: ${messageId}`);
                return res.status(200).json({ message: 'Log not found' });
            }

            const updates = {};

            switch (notificationType) {
                case 'Delivery':
                    updates.status = 'delivered';
                    updates.deliveredAt = new Date(message.delivery.timestamp);
                    break;

                case 'Bounce':
                    updates.status = 'bounced';
                    updates.errorMessage = message.bounce.bouncedRecipients[0]?.diagnosticCode || 'Email bounced';
                    break;

                case 'Complaint':
                    console.log(`📧 Spam complaint for ${mail.destination[0]}`);
                    break;

                case 'Open':
                    updates.status = 'opened';
                    updates.openedAt = new Date(message.open.timestamp);
                    break;

                case 'Click':
                    updates.status = 'clicked';
                    break;

                default:
                    console.warn(`⚠️  Unknown SES notification type: ${notificationType}`);
            }

            if (Object.keys(updates).length > 0) {
                await log.update(updates);
                console.log(`✅ Updated log ${log.id}: ${notificationType}`);
            }

            return res.status(200).json({ message: 'Event processed' });
        }

        res.status(400).json({ message: 'Unknown SNS message type' });
    } catch (error) {
        console.error('❌ SES webhook error:', error);
        res.status(500).json({ message: 'Webhook processing failed', error: error.message });
    }
});

/**
 * GET /webhook/email/test
 * Test endpoint to verify webhook is accessible
 */
router.get('/test', (req, res) => {
    res.json({
        message: 'Email webhook endpoint is active',
        endpoints: {
            sendgrid: '/webhook/email/sendgrid',
            ses: '/webhook/email/ses'
        }
    });
});

module.exports = router;
