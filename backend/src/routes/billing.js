const express = require('express');
const router = express.Router();
const { SubscriptionPlan, Subscription, Invoice } = require('../models');
const { requireAuth } = require('../middleware/auth');
const stripeService = require('../services/stripeService');

// GET /api/billing/plans - List all active subscription plans
router.get('/plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.findAll({
            where: { isActive: true },
            order: [['priceMonthly', 'ASC']]
        });

        res.json({ plans });
    } catch (err) {
        console.error('Error fetching plans:', err);
        res.status(500).json({ message: 'Failed to fetch plans' });
    }
});

// GET /api/billing/coupons/validate/:code - Validate a coupon
router.get('/coupons/validate/:code', requireAuth, async (req, res) => {
    try {
        const { code } = req.params;
        const { Coupon } = require('../models');
        const { Op } = require('sequelize');

        const coupon = await Coupon.findOne({
            where: {
                code: code.toUpperCase(),
                isActive: true
            }
        });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        // Check expiry
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        // Check redemptions
        if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
            return res.status(400).json({ message: 'Coupon limit reached' });
        }

        res.json({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            description: coupon.description
        });
    } catch (err) {
        console.error('Error validating coupon:', err);
        res.status(500).json({ message: 'Failed to validate coupon' });
    }
});

// GET /api/billing/subscription - Get current user's subscription with usage stats
router.get('/subscription', requireAuth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { userId: req.user.id },
            include: [{
                model: SubscriptionPlan,
                as: 'plan'
            }],
            order: [['created_at', 'DESC']]
        });

        // Calculate Usage
        const { Widget, Message } = require('../models');
        const { Op } = require('sequelize');

        // 1. Widgets Count
        const widgetsCount = await Widget.count({ where: { user_id: req.user.id } });

        // 2. Messages Month Count
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const messagesCount = await Message.count({
            where: {
                userId: req.user.id,
                created_at: { [Op.gte]: startOfMonth }
            }
        });

        // 3. Team Members Count
        const { WorkspaceMember } = require('../models');
        const membersCount = await WorkspaceMember.count({
            where: { user_id: req.user.id } // This counts workspaces where user is a member/owner
        });

        // 4. Storage (Real calculation from user uploads)
        let storageUsage = 0; // MB
        try {
            const { Setting } = require('../models');
            const uploadRecords = await Setting.findAll({
                where: { section: 'upload_ownership' }
            });
            let totalBytes = 0;
            for (const record of uploadRecords) {
                try {
                    const data = typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
                    if (data && data.userId === req.user.id && data.size) {
                        totalBytes += Number(data.size);
                    }
                } catch (e) {}
            }
            storageUsage = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
        } catch (storageErr) {
            console.warn('[Billing] Error computing storage usage:', storageErr.message);
        }

        if (!subscription) {
            return res.json({
                subscription: null,
                usage: {
                    widgets: widgetsCount,
                    messages: messagesCount,
                    members: membersCount,
                    storage: storageUsage
                }
            });
        }

        res.json({
            subscription,
            usage: {
                widgets: widgetsCount,
                messages: messagesCount,
                members: membersCount,
                storage: storageUsage
            }
        });
    } catch (err) {
        console.error('Error fetching subscription:', err);
        res.status(500).json({ message: 'Failed to fetch subscription' });
    }
});

// POST /api/billing/mock-activate - Simulate direct plan upgrade in dev/demo
router.post('/mock-activate', requireAuth, async (req, res) => {
    try {
        const { planId, workspaceId } = req.body;
        if (!planId) return res.status(400).json({ message: 'Plan ID required' });

        const plan = await SubscriptionPlan.findByPk(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        const billingService = require('../services/billingService');
        const mockSubId = `mock_sub_${Date.now()}`;
        const sub = await billingService.syncSubscription({
            gateway: 'mock',
            externalId: mockSubId,
            status: 'active',
            planId: plan.id,
            userId: req.user.id,
            workspaceId,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            payload: { mockActivation: true, activatedBy: req.user.id }
        });

        res.json({
            success: true,
            message: `Successfully activated ${plan.name} plan (Mock Mode)`,
            subscription: sub
        });
    } catch (err) {
        console.error('Mock activation error:', err);
        res.status(500).json({ message: 'Failed to activate mock subscription' });
    }
});

// POST /api/billing/checkout - Create checkout session (Stripe, PayPal, or Mock)
router.post('/checkout', requireAuth, async (req, res) => {
    try {
        const { planId, billingCycle = 'monthly', workspaceId, gateway = 'mock' } = req.body;
        const billingService = require('../services/billingService');

        if (!planId) {
            return res.status(400).json({ message: 'Plan ID is required' });
        }

        const session = await billingService.createCheckoutSession({
            userId: req.user.id,
            workspaceId,
            planId,
            billingCycle,
            gateway,
            successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing`,
            cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
            ipAddress: req.ip
        });

        res.json({ url: session.url, id: session.id });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ message: error.message || 'Failed to create checkout session' });
    }
});

// POST /api/billing/portal - Create customer portal session
router.post('/portal', requireAuth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { userId: req.user.id }
        });

        if (!subscription || !subscription.stripeCustomerId) {
            return res.status(404).json({ message: 'No subscription found' });
        }

        const session = await stripeService.createPortalSession(
            subscription.stripeCustomerId,
            `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing`
        );

        res.json({ url: session.url });
    } catch (err) {
        console.error('Error creating portal session:', err);
        res.status(500).json({ message: 'Failed to create portal session' });
    }
});

// POST /api/billing/cancel - Cancel subscription
router.post('/cancel', requireAuth, async (req, res) => {
    try {
        const { immediate = false } = req.body;

        const subscription = await Subscription.findOne({
            where: { userId: req.user.id, status: 'active' }
        });

        if (!subscription) {
            return res.status(404).json({ message: 'No active subscription found' });
        }

        const stripeSubscription = await stripeService.cancelSubscription(
            subscription.stripeSubscriptionId,
            !immediate
        );

        // Update local subscription
        await subscription.update({
            cancelAtPeriodEnd: !immediate,
            canceledAt: immediate ? new Date() : null,
            status: immediate ? 'canceled' : subscription.status
        });

        res.json({
            message: immediate ? 'Subscription canceled' : 'Subscription will cancel at period end',
            subscription
        });
    } catch (err) {
        console.error('Error canceling subscription:', err);
        res.status(500).json({ message: 'Failed to cancel subscription' });
    }
});

// POST /api/billing/resume - Resume canceled subscription
router.post('/resume', requireAuth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { userId: req.user.id, cancelAtPeriodEnd: true }
        });

        if (!subscription) {
            return res.status(404).json({ message: 'No subscription to resume' });
        }

        await stripeService.resumeSubscription(subscription.stripeSubscriptionId);

        await subscription.update({
            cancelAtPeriodEnd: false,
            canceledAt: null
        });

        res.json({
            message: 'Subscription resumed',
            subscription
        });
    } catch (err) {
        console.error('Error resuming subscription:', err);
        res.status(500).json({ message: 'Failed to resume subscription' });
    }
});

// GET /api/billing/invoices - List user's invoices
router.get('/invoices', requireAuth, async (req, res) => {
    try {
        const invoices = await Invoice.findAll({
            where: { userId: req.user.id },
            order: [['created_at', 'DESC']],
            limit: 20
        });

        res.json({ invoices });
    } catch (err) {
        console.error('Error fetching invoices:', err);
        res.status(500).json({ message: 'Failed to fetch invoices' });
    }
});

module.exports = router;
