const express = require('express');
const router = express.Router();
const { ActivityLog, User } = require('../../models');
const { Op } = require('sequelize');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');

router.use(requireAuth, requireAdmin);

// GET /api/admin/activity-logs
router.get('/', async (req, res) => {
    try {
        const { action, userId, startDate, endDate, limit = 50, offset = 0 } = req.query;

        const where = {};

        if (action) {
            where.action = action;
        }

        if (userId) {
            where.user_id = userId;
        }

        if (startDate && endDate) {
            where.created_at = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        const logs = await ActivityLog.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email']
            }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            logs: logs.rows,
            total: logs.count,
            totalPages: Math.ceil(logs.count / limit),
            currentPage: Math.floor(offset / limit) + 1
        });
    } catch (err) {
        console.error('Error fetching activity logs:', err);
        res.status(500).json({ message: 'Failed to fetch logs' });
    }
});

module.exports = router;
