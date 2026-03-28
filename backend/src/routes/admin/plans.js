const express = require('express');
const router = express.Router();
const { SubscriptionPlan } = require('../../models');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/plans
 * List all plans
 */
router.get('/', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.findAll({
            order: [['priceMonthly', 'ASC']]
        });
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error loading plans' });
    }
});

/**
 * POST /api/admin/plans
 * Create a new plan
 */
router.post('/', async (req, res) => {
    try {
        const {
            name, priceMonthly, priceYearly,
            stripePriceIdMonthly, stripePriceIdYearly,
            paypalPlanIdMonthly, paypalPlanIdYearly,
            maxChats, maxMessagesPerMonth, maxWidgets, maxMembers,
            features, isActive
        } = req.body;

        const plan = await SubscriptionPlan.create({
            name,
            priceMonthly,
            priceYearly,
            stripePriceIdMonthly,
            stripePriceIdYearly,
            paypalPlanIdMonthly,
            paypalPlanIdYearly,
            maxChats,
            maxMessagesPerMonth,
            maxWidgets,
            maxMembers,
            features,
            isActive
        });

        res.status(201).json(plan);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating plan' });
    }
});

/**
 * PATCH /api/admin/plans/:id
 * Update a plan
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const plan = await SubscriptionPlan.findByPk(id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        await plan.update(updates);
        res.json(plan);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating plan' });
    }
});

/**
 * DELETE /api/admin/plans/:id
 * Delete a plan (Soft delete or check usage)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await SubscriptionPlan.findByPk(id);

        // Hard delete for now, in real app might want soft delete
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        await plan.destroy();
        res.json({ message: 'Plan deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting plan' });
    }
});

module.exports = router;
