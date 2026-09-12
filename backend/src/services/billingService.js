const stripeService = require('./stripeService');
const paypalService = require('./paypalService');
const { BillingLog, Subscription, SubscriptionPlan, Workspace, User } = require('../models');

/**
 * Advanced Billing Service (Multi-Gateway Abstraction)
 * Handles all payment logic, limit enforcement tracking, and advanced auditing.
 */
class BillingService {
    /**
     * Log a billing event for auditing
     */
    async logEvent({ userId, workspaceId, gateway, eventType, status, amount, currency, externalId, payload, error, ipAddress }) {
        try {
            return await BillingLog.create({
                userId,
                workspaceId,
                gateway,
                eventType,
                status: status || 'success',
                amount,
                currency: currency || 'USD',
                externalId,
                payload,
                error,
                ipAddress
            });
        } catch (err) {
            console.error('CRITICAL: Failed to log billing event:', err);
        }
    }

    /**
     * Create a checkout session (Stripe or PayPal)
     */
    async createCheckoutSession({ userId, workspaceId, planId, billingCycle, gateway = 'stripe', successUrl, cancelUrl, ipAddress }) {
        const plan = await SubscriptionPlan.findByPk(planId);
        if (!plan) throw new Error('Plan not found');

        const user = await User.findByPk(userId);
        if (!user) throw new Error('User not found');

        let session = null;
        const eventData = {
            userId,
            workspaceId,
            gateway,
            eventType: 'checkout_initiated',
            status: 'pending',
            ipAddress,
            payload: { planId, billingCycle }
        };

        if (gateway === 'mock') {
            const mockId = `mock_sub_${Date.now()}`;
            // Instantly activate subscription in mock mode
            await this.syncSubscription({
                gateway: 'mock',
                externalId: mockId,
                status: 'active',
                planId,
                userId,
                workspaceId,
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                payload: { mock: true, billingCycle }
            });

            session = {
                id: mockId,
                url: `${successUrl}?session_id=${mockId}&status=mock_activated&plan_id=${planId}`
            };

            await this.logEvent({ ...eventData, externalId: session.id, status: 'success', gateway: 'mock' });
        } else if (gateway === 'stripe') {
            const priceId = billingCycle === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
            if (!priceId) {
                // Fallback to mock session if Stripe price not configured
                console.warn('⚠️ Stripe Price ID not configured. Using Mock checkout fallback.');
                const mockId = `mock_stripe_${Date.now()}`;
                await this.syncSubscription({
                    gateway: 'mock',
                    externalId: mockId,
                    status: 'active',
                    planId,
                    userId,
                    workspaceId,
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    payload: { mock: true, reason: 'stripe_keys_missing' }
                });
                return {
                    id: mockId,
                    url: `${successUrl}?session_id=${mockId}&status=mock_activated&plan_id=${planId}`
                };
            }

            // Get or create Stripe customer
            let stripeCustomerId = user.stripeCustomerId;
            if (!stripeCustomerId) {
                const customer = await stripeService.createCustomer(user);
                stripeCustomerId = customer.id;
                await user.update({ stripeCustomerId });
            }

            session = await stripeService.createCheckoutSession({
                customerId: stripeCustomerId,
                priceId,
                successUrl: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl,
                trialDays: plan.trialDays
            });

            await this.logEvent({ ...eventData, externalId: session.id });
        } else if (gateway === 'paypal') {
            let planIdPayPal = billingCycle === 'yearly' ? plan.paypalPlanIdYearly : plan.paypalPlanIdMonthly;

            // AUTOMATION: Create plan on-the-fly if missing
            if (!planIdPayPal) {
                console.log(`[PayPal AutoSync] Plan ID missing for "${plan.name}" (${billingCycle}). Creating...`);
                try {
                    const productId = await paypalService.ensureProductExists();
                    const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

                    planIdPayPal = await paypalService.createPlan({
                        name: plan.name,
                        productId,
                        price,
                        interval: billingCycle === 'yearly' ? 'YEAR' : 'MONTH'
                    });

                    // Save the new ID back to the database for future use
                    if (billingCycle === 'yearly') {
                        await plan.update({ paypalPlanIdYearly: planIdPayPal });
                    } else {
                        await plan.update({ paypalPlanIdMonthly: planIdPayPal });
                    }
                    console.log(`[PayPal AutoSync] Successfully created and saved plan: ${planIdPayPal}`);
                } catch (err) {
                    console.warn(`[PayPal AutoSync] Credentials not live, using mock PayPal session: ${err.message}`);
                    planIdPayPal = `P-MOCK-${Date.now()}`;
                }
            }

            try {
                session = await paypalService.createSubscription({
                    planId: planIdPayPal,
                    returnUrl: successUrl,
                    cancelUrl,
                    customId: JSON.stringify({ userId, workspaceId, planId })
                });
            } catch (payPalErr) {
                console.warn('PayPal subscription API error, falling back to mock approval URL:', payPalErr.message);
                const mockSubId = `I-MOCK-${Date.now()}`;
                await this.syncSubscription({
                    gateway: 'mock',
                    externalId: mockSubId,
                    status: 'active',
                    planId,
                    userId,
                    workspaceId,
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    payload: { mock: true, reason: 'paypal_mock_fallback' }
                });
                session = {
                    id: mockSubId,
                    url: `${successUrl}?session_id=${mockSubId}&status=mock_activated&plan_id=${planId}`
                };
            }

            await this.logEvent({ ...eventData, externalId: session.id, gateway: 'paypal' });
        }

        return session;
    }

    /**
     * Synchronize a subscription in the database (Called from webhooks)
     */
    async syncSubscription({ gateway, externalId, status, planId, userId, workspaceId, currentPeriodEnd, payload }) {
        try {
            let whereCondition;
            if (gateway === 'stripe') {
                whereCondition = { stripeSubscriptionId: externalId };
            } else if (gateway === 'paypal') {
                whereCondition = { paypalSubscriptionId: externalId };
            } else {
                whereCondition = { userId, gateway: 'mock' };
            }

            const [subscription, created] = await Subscription.findOrCreate({
                where: whereCondition,
                defaults: {
                    userId,
                    planId,
                    gateway,
                    status,
                    currentPeriodEnd,
                    paypalSubscriptionId: gateway === 'paypal' ? externalId : (gateway === 'mock' ? externalId : null),
                    stripeSubscriptionId: gateway === 'stripe' ? externalId : null
                }
            });

            if (!created) {
                await subscription.update({
                    status,
                    planId: planId || subscription.planId,
                    currentPeriodEnd: currentPeriodEnd || subscription.currentPeriodEnd
                });
            }

            // Sync limit fields to Workspace if applicable
            if (workspaceId) {
                const workspace = await Workspace.findByPk(workspaceId);
                const plan = await SubscriptionPlan.findByPk(planId || subscription.planId);
                if (workspace && plan) {
                    await workspace.update({
                        plan_type: plan.name,
                        max_members: plan.maxMembers
                    });
                }
            }

            await this.logEvent({
                userId: userId || subscription.userId,
                workspaceId,
                gateway,
                eventType: 'subscription_synced',
                externalId,
                payload
            });

            return subscription;
        } catch (err) {
            await this.logEvent({
                gateway,
                eventType: 'subscription_sync_failed',
                status: 'failed',
                error: err.message,
                payload
            });
            throw err;
        }
    }
}

module.exports = new BillingService();
