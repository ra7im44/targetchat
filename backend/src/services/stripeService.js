const Stripe = require('stripe');

const { Setting } = require('../models');

// Lazy initialization helper
let stripeInstance = null;
let lastApiKey = null;

async function getStripeClient() {
    try {
        const setting = await Setting.findOne({ where: { key: 'STRIPE_SECRET_KEY' } });
        const apiKey = setting?.value || process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

        // Re-initialize if key changed or first run
        if (!stripeInstance || apiKey !== lastApiKey) {
            stripeInstance = new Stripe(apiKey, { apiVersion: '2023-10-16' });
            lastApiKey = apiKey;
        }

        return { stripe: stripeInstance, apiKey };
    } catch (err) {
        console.error('Error getting Stripe client:', err);
        // Fallback
        if (!stripeInstance) {
            stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2023-10-16' });
        }
        return { stripe: stripeInstance, apiKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder' };
    }
}

/**
 * Create a Stripe customer for a user
 */
async function createCustomer(user) {
    try {
        const { stripe, apiKey } = await getStripeClient();

        // Mock for development
        if (apiKey === 'sk_test_placeholder' || !apiKey) {
            console.log('⚠️ Using MOCK Stripe Customer (Development Mode)');
            return {
                id: `cus_mock_${user.id}_${Date.now()}`,
                email: user.email,
                name: user.name
            };
        }

        const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: {
                userId: user.id.toString()
            }
        });
        return customer;
    } catch (error) {
        console.error('Error creating Stripe customer:', error);
        throw error;
    }
}

/**
 * Create a checkout session for subscription
 */
async function createCheckoutSession({ customerId, priceId, successUrl, cancelUrl, trialDays = 0 }) {
    try {
        const { stripe, apiKey } = await getStripeClient();

        // Mock for development/testing if using placeholder key or dummy price IDs
        if (
            apiKey === 'sk_test_placeholder' ||
            !apiKey ||
            (typeof priceId === 'string' && (priceId.startsWith('price_pro_') || priceId.startsWith('price_enterprise_')))
        ) {
            console.log('⚠️ Using MOCK Stripe Checkout Session (Development Mode)');
            return {
                id: `cs_test_${Date.now()}`,
                url: `${successUrl}&session_id=mock_session_${Date.now()}`
            };
        }

        const sessionParams = {
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true
        };

        // Add trial if specified
        if (trialDays > 0) {
            sessionParams.subscription_data = {
                trial_period_days: trialDays
            };
        }

        const session = await stripe.checkout.sessions.create(sessionParams);
        return session;
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
}

/**
 * Create a customer portal session
 */
async function createPortalSession(customerId, returnUrl) {
    try {
        const { stripe, apiKey } = await getStripeClient();

        // Mock for development
        if (
            apiKey === 'sk_test_placeholder' ||
            !apiKey ||
            (customerId && customerId.startsWith('cus_mock_'))
        ) {
            console.log('⚠️ Using MOCK Stripe Portal (Development Mode)');
            return {
                id: `bps_mock_${Date.now()}`,
                url: `${returnUrl}?portal_session=mock`
            };
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl
        });
        return session;
    } catch (error) {
        console.error('Error creating portal session:', error);
        throw error;
    }
}

/**
 * Create a subscription directly (without checkout)
 */
async function createSubscription(customerId, priceId, trialDays = 0) {
    try {
        const { stripe } = await getStripeClient();
        const subscriptionParams = {
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent']
        };

        if (trialDays > 0) {
            subscriptionParams.trial_period_days = trialDays;
        }

        const subscription = await stripe.subscriptions.create(subscriptionParams);
        return subscription;
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
    }
}

/**
 * Update subscription (change plan)
 */
async function updateSubscription(subscriptionId, newPriceId) {
    try {
        const { stripe } = await getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            items: [{
                id: subscription.items.data[0].id,
                price: newPriceId
            }],
            proration_behavior: 'create_prorations'
        });

        return updatedSubscription;
    } catch (error) {
        console.error('Error updating subscription:', error);
        throw error;
    }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
        const { stripe } = await getStripeClient();
        if (cancelAtPeriodEnd) {
            const subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true
            });
            return subscription;
        } else {
            const subscription = await stripe.subscriptions.cancel(subscriptionId);
            return subscription;
        }
    } catch (error) {
        console.error('Error canceling subscription:', error);
        throw error;
    }
}

/**
 * Resume a canceled subscription
 */
async function resumeSubscription(subscriptionId) {
    try {
        const { stripe } = await getStripeClient();
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false
        });
        return subscription;
    } catch (error) {
        console.error('Error resuming subscription:', error);
        throw error;
    }
}

/**
 * Retrieve subscription details
 */
async function retrieveSubscription(subscriptionId) {
    try {
        const { stripe } = await getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return subscription;
    } catch (error) {
        console.error('Error retrieving subscription:', error);
        throw error;
    }
}

/**
 * Get upcoming invoice (preview)
 */
async function getUpcomingInvoice(customerId) {
    try {
        const { stripe } = await getStripeClient();
        const invoice = await stripe.invoices.retrieveUpcoming({
            customer: customerId
        });
        return invoice;
    } catch (error) {
        console.error('Error retrieving upcoming invoice:', error);
        throw error;
    }
}

/**
 * List customer invoices
 */
async function listInvoices(customerId, limit = 10) {
    try {
        const { stripe } = await getStripeClient();
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit
        });
        return invoices.data;
    } catch (error) {
        console.error('Error listing invoices:', error);
        throw error;
    }
}

/**
 * Retrieve invoice details
 */
async function retrieveInvoice(invoiceId) {
    try {
        const { stripe } = await getStripeClient();
        const invoice = await stripe.invoices.retrieve(invoiceId);
        return invoice;
    } catch (error) {
        console.error('Error retrieving invoice:', error);
        throw error;
    }
}

/**
 * Verify webhook signature
 */
async function verifyWebhookSignature(payload, signature, secret) {
    try {
        const { stripe } = await getStripeClient();
        const event = stripe.webhooks.constructEvent(payload, signature, secret);
        return event;
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        throw error;
    }
}

module.exports = {
    createCustomer,
    createCheckoutSession,
    createPortalSession,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    resumeSubscription,
    retrieveSubscription,
    getUpcomingInvoice,
    listInvoices,
    retrieveInvoice,
    verifyWebhookSignature
};
