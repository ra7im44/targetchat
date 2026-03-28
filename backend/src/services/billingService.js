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

        if (gateway === 'stripe') {
            const priceId = billingCycle === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
            if (!priceId) throw new Error('Stripe Price ID not configured for this plan');

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
                    await this.logEvent({
                        ...eventData,
                        status: 'error',
                        error: 'Failed to auto-create PayPal plan: ' + err.message,
                        gateway: 'paypal'
                    });
                    throw new Error('Failed to automatically configure PayPal. Please check your credentials or contact support.');
                }
            }

            session = await paypalService.createSubscription({
                planId: planIdPayPal,
                returnUrl: successUrl,
                cancelUrl,
                customId: JSON.stringify({ userId, workspaceId, planId })
            });

            await this.logEvent({ ...eventData, externalId: session.id, gateway: 'paypal' });
        }

        return session;
    }

    /**
     * Synchronize a subscription in the database (Called from webhooks)
     */
    async syncSubscription({ gateway, externalId, status, planId, userId, workspaceId, currentPeriodEnd, payload }) {
        try {
            const [subscription, created] = await Subscription.findOrCreate({
                where: gateway === 'stripe'
                    ? { stripeSubscriptionId: externalId }
                    : { paypalSubscriptionId: externalId },
                defaults: {
                    userId,
                    planId,
                    gateway,
                    status,
                    currentPeriodEnd
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
