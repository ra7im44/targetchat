const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const billingService = require('../../services/billingService');
const paypalService = require('../../services/paypalService');
const { SubscriptionPlan } = require('../../models');

/**
 * POST /webhook/paypal
 * Handle PayPal Webhook Events
 */
router.post('/', bodyParser.json(), async (req, res) => {
    const event = req.body;

    // In production, you should verify the webhook signature here.
    // For now, we proceed with event processing.

    try {
        console.log('--- PayPal Webhook Received ---');
        console.log('Event Type:', event.event_type);

        let subscriptionId, status, currentPeriodEnd, customId;

        switch (event.event_type) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
            case 'BILLING.SUBSCRIPTION.CREATED':
                subscriptionId = event.resource.id;
                status = 'active';
                customId = event.resource.custom_id ? JSON.parse(event.resource.custom_id) : {};

                await billingService.syncSubscription({
                    gateway: 'paypal',
                    externalId: subscriptionId,
                    status,
                    userId: customId.userId,
                    workspaceId: customId.workspaceId,
                    planId: customId.planId,
                    currentPeriodEnd: event.resource.billing_info?.next_billing_time,
                    payload: event
                });
                break;

            case 'PAYMENT.SALE.COMPLETED':
                subscriptionId = event.resource.billing_agreement_id;
                if (subscriptionId) {
                    const details = await paypalService.getSubscriptionDetails(subscriptionId);
                    customId = details.custom_id ? JSON.parse(details.custom_id) : {};

                    await billingService.syncSubscription({
                        gateway: 'paypal',
                        externalId: subscriptionId,
                        status: 'active',
                        userId: customId.userId,
                        workspaceId: customId.workspaceId,
                        planId: customId.planId,
                        currentPeriodEnd: details.billing_info?.next_billing_time,
                        payload: event
                    });
                }
                break;

            case 'BILLING.SUBSCRIPTION.CANCELLED':
            case 'BILLING.SUBSCRIPTION.SUSPENDED':
            case 'BILLING.SUBSCRIPTION.EXPIRED':
                subscriptionId = event.resource.id;
                await billingService.syncSubscription({
                    gateway: 'paypal',
                    externalId: subscriptionId,
                    status: 'canceled',
                    payload: event
                });
                break;
        }

        res.status(200).send('Webhook Processed');
    } catch (err) {
        console.error('PayPal Webhook Error:', err);
        await billingService.logEvent({
            gateway: 'paypal',
            eventType: 'webhook_error',
            status: 'failed',
            error: err.message,
            payload: event
        });
        res.status(500).send('Webhook Error');
    }
});

module.exports = router;
