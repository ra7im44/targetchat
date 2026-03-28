const express = require('express');
const router = express.Router();
const { BillingLog, User } = require('../../models');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/billing/logs
 * Fetch all billing logs with user details
 */
router.get('/logs', async (req, res) => {
    try {
        const logs = await BillingLog.findAll({
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email']
            }],
            order: [['created_at', 'DESC']],
            limit: 100
        });
        res.json(logs);
    } catch (err) {
        console.error('Error fetching billing logs:', err);
        res.status(500).json({ message: 'Error fetching billing logs' });
    }
});

module.exports = router;
