const express = require('express');
const router = express.Router();
const { Subscription, Invoice, BillingEvent, SubscriptionPlan, User } = require('../../models');
const stripeService = require('../../services/stripeService');
const { triggerEvent } = require('../../triggers/emailTriggers');

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify webhook signature
        event = stripeService.verifyWebhookSignature(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Check if event already processed (idempotency)
    const isProcessed = await BillingEvent.isEventProcessed(event.id);
    if (isProcessed) {
        console.log(`Event ${event.id} already processed, skipping`);
        return res.json({ received: true, skipped: true });
    }

    // Log the event
    const billingEvent = await BillingEvent.create({
        eventType: event.type,
        stripeEventId: event.id,
        payload: event.data.object,
        processed: false
    });

    try {
        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Mark event as processed
        await billingEvent.markAsProcessed();

        res.json({ received: true });
    } catch (err) {
        console.error('Error processing webhook:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Handle checkout session completed
async function handleCheckoutCompleted(session) {
    console.log('Checkout completed:', session.id);

    const customerId = session.customer;
    const subscriptionId = session.subscription;

    if (!subscriptionId) return;

    // Retrieve full subscription details from Stripe
    const stripeSubscription = await stripeService.retrieveSubscription(subscriptionId);

    // Find or create subscription in database
    await handleSubscriptionUpdated(stripeSubscription);
}

// Handle subscription created/updated
async function handleSubscriptionUpdated(stripeSubscription) {
    console.log('Subscription updated:', stripeSubscription.id);

    // Find user by Stripe customer ID
    const existingSubscription = await Subscription.findOne({
        where: { stripeCustomerId: stripeSubscription.customer }
    });

    if (!existingSubscription) {
        console.error('No subscription found for customer:', stripeSubscription.customer);
        return;
    }

    // Extract subscription data
    const subscriptionData = {
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
    };

    // Update or create subscription
    await Subscription.upsert({
        ...subscriptionData,
        userId: existingSubscription.userId,
        planId: existingSubscription.planId,
        stripeCustomerId: stripeSubscription.customer
    });

    console.log('Subscription updated in database');
}

// Handle subscription deleted
async function handleSubscriptionDeleted(stripeSubscription) {
    console.log('Subscription deleted:', stripeSubscription.id);

    const subscription = await Subscription.findOne({
        where: { stripeSubscriptionId: stripeSubscription.id }
    });

    if (subscription) {
        await subscription.update({
            status: 'canceled',
            canceledAt: new Date()
        });
        console.log('Subscription marked as canceled');
    }
}

// Handle invoice paid
async function handleInvoicePaid(stripeInvoice) {
    console.log('Invoice paid:', stripeInvoice.id);

    // Find subscription
    const subscription = await Subscription.findOne({
        where: { stripeSubscriptionId: stripeInvoice.subscription },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
    });

    if (!subscription) {
        console.error('No subscription found for invoice:', stripeInvoice.id);
        return;
    }

    // Create or update invoice record
    await Invoice.upsert({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        stripeInvoiceId: stripeInvoice.id,
        amount: stripeInvoice.amount_paid / 100, // Convert from cents
        currency: stripeInvoice.currency.toUpperCase(),
        status: 'paid',
        invoicePdf: stripeInvoice.invoice_pdf,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
        paidAt: new Date(stripeInvoice.status_transitions.paid_at * 1000)
    });

    // Trigger payment success email (normalized invoice shape for the billing trigger)
    const user = await User.findByPk(subscription.userId);
    if (user) {
        const invoice = await Invoice.findOne({ where: { stripeInvoiceId: stripeInvoice.id } });
        await triggerEvent('billing.payment_success', user, {
            amount: invoice ? invoice.amount : stripeInvoice.amount_paid / 100,
            plan: { name: subscription.plan ? subscription.plan.name : 'Subscription' },
            createdAt: invoice ? (invoice.paidAt || invoice.createdAt) : new Date(),
            invoicePdf: invoice ? invoice.invoicePdf : stripeInvoice.invoice_pdf,
            nextBillingDate: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
        }).catch(err => console.error('Failed to trigger payment success email:', err));
    }

    console.log('Invoice recorded in database');
}

// Handle invoice payment failed
async function handleInvoicePaymentFailed(stripeInvoice) {
    console.log('Invoice payment failed:', stripeInvoice.id);

    const subscription = await Subscription.findOne({
        where: { stripeSubscriptionId: stripeInvoice.subscription },
        include: [{ model: User, as: 'user' }, { model: SubscriptionPlan, as: 'plan' }]
    });

    if (!subscription) return;

    // Update subscription status
    await subscription.update({
        status: 'past_due'
    });

    // Record failed invoice
    await Invoice.upsert({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        stripeInvoiceId: stripeInvoice.id,
        amount: stripeInvoice.amount_due / 100,
        currency: stripeInvoice.currency.toUpperCase(),
        status: 'open',
        invoicePdf: stripeInvoice.invoice_pdf,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url
    });

    // Trigger payment failed email (normalized invoice shape for the billing trigger)
    if (subscription.user) {
        const invoice = await Invoice.findOne({ where: { stripeInvoiceId: stripeInvoice.id } });
        await triggerEvent('billing.payment_failed', subscription.user, {
            id: invoice ? invoice.id : null,
            amount: invoice ? invoice.amount : stripeInvoice.amount_due / 100,
            plan: { name: subscription.plan ? subscription.plan.name : 'Subscription' },
            errorMessage: 'Payment declined'
        }).catch(err => console.error('Failed to trigger payment failed email:', err));
    }
    console.log('Failed payment recorded');
}


module.exports = router;
