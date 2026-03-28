const express = require('express');
const router = express.Router();
const { Subscription, SubscriptionPlan, User, Invoice, BillingEvent } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');

router.use(requireAuth, requireAdmin);

// GET /api/admin/billing/stats - Get billing statistics
router.get('/stats', async (req, res) => {
    try {
        const totalSubscriptions = await Subscription.count();
        const activeSubscriptions = await Subscription.count({ where: { status: 'active' } });
        const trialingSubscriptions = await Subscription.count({ where: { status: 'trialing' } });
        const canceledSubscriptions = await Subscription.count({ where: { status: 'canceled' } });

        // Calculate MRR (approximate) - sum of active monthly/yearly plans
        // Note: This is simplified. Real MRR needs to handle yearly / 12 and discounts.
        const activeSubs = await Subscription.findAll({
            where: { status: 'active' },
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });

        const mrr = activeSubs.reduce((sum, sub) => {
            if (!sub.plan) return sum;
            const price = parseFloat(sub.plan.priceMonthly);
            return sum + (isNaN(price) ? 0 : price);
        }, 0);

        res.json({
            total: totalSubscriptions,
            active: activeSubscriptions,
            trialing: trialingSubscriptions,
            canceled: canceledSubscriptions,
            mrr
        });
    } catch (err) {
        console.error('Error fetching billing stats:', err);
        res.status(500).json({ message: 'Failed to fetch billing stats' });
    }
});

// GET /api/admin/billing/subscriptions - List all subscriptions
router.get('/subscriptions', async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status && status !== 'all') {
            where.status = status;
        }

        const { count, rows } = await Subscription.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: SubscriptionPlan,
                    as: 'plan',
                    attributes: ['id', 'name', 'priceMonthly']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            subscriptions: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        console.error('Error fetching subscriptions:', err);
        res.status(500).json({ message: 'Failed to fetch subscriptions' });
    }
});

// GET /api/admin/billing/plans - List all plans
router.get('/plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.findAll({
            order: [['priceMonthly', 'ASC']]
        });
        res.json({ plans });
    } catch (err) {
        console.error('Error fetching plans:', err);
        res.status(500).json({ message: 'Failed to fetch plans' });
    }
});

// PATCH /api/admin/billing/plans/:id - Update plan
router.patch('/plans/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, name, description, trialDays } = req.body;

        const plan = await SubscriptionPlan.findByPk(id);
        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        await plan.update({
            isActive: isActive !== undefined ? isActive : plan.isActive,
            name: name || plan.name,
            description: description || plan.description,
            trialDays: trialDays !== undefined ? trialDays : plan.trialDays
        });

        res.json({ plan });
    } catch (err) {
        console.error('Error updating plan:', err);
        res.status(500).json({ message: 'Failed to update plan' });
    }
});

// GET /api/admin/billing/events - List billing events
router.get('/events', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await BillingEvent.findAndCountAll({
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            events: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        console.error('Error fetching billing events:', err);
        res.status(500).json({ message: 'Failed to fetch billing events' });
    }
});

module.exports = router;
