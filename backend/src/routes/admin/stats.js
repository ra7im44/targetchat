const express = require('express');
const router = express.Router();
const { User, Chat, Message, Workflow } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { Op } = require('sequelize');

router.use(requireAuth, requireAdmin);

// GET /api/admin/stats - Get dashboard statistics
router.get('/', async (req, res) => {
    try {
        const totalUsers = await User.count();
        // Handle null isActive values
        const activeUsers = await User.count({
            where: {
                [Op.or]: [
                    { isActive: true },
                    { isActive: null }  // Treat null as active for backward compatibility
                ]
            }
        });
        const totalChats = await Chat.count();
        const totalMessages = await Message.count();
        const totalWorkflows = await Workflow.count();
        const activeWorkflows = await Workflow.count({
            where: {
                [Op.or]: [
                    { isActive: true },
                    { isActive: null }
                ]
            }
        });

        // Users registered in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newUsers = await User.count({
            where: {
                created_at: { [Op.gte]: sevenDaysAgo }
            }
        });

        // Messages sent today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const messagesToday = await Message.count({
            where: {
                created_at: { [Op.gte]: today }
            }
        });

        console.log('Stats:', { totalUsers, activeUsers, totalChats, totalMessages, totalWorkflows, activeWorkflows, newUsers, messagesToday });

        res.json({
            users: {
                total: totalUsers,
                active: activeUsers,
                newThisWeek: newUsers
            },
            chats: {
                total: totalChats
            },
            messages: {
                total: totalMessages,
                today: messagesToday
            },
            workflows: {
                total: totalWorkflows,
                active: activeWorkflows
            }
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
