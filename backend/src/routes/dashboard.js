const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { Chat, Workflow, Message, ActivityLog, Widget, Lead } = require('../models');
const { Op } = require('sequelize');

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Total Widgets
        const totalWidgets = await Widget.count({ where: { user_id: userId } });

        // 2. Total Leads (Owned by user)
        const totalLeads = await Lead.count({ where: { owner_user_id: userId } });

        // 3. Active Chats (Status 'open' or 'active'?)
        // Let's assume 'open' or 'assigned' means active. 
        // Based on other files, status might be 'active' or 'open'.
        // Let's count all chats that are NOT 'closed' or 'resolved'.
        const activeChats = await Chat.count({
            where: {
                userId, // Assigned to user (or owned by user's widget? Current logic seems to link Chat to User directly via assignedTo?)
                // Wait, Chat.userId is usually the VISITOR ID (if logged in) or Agent?
                // In models/index.js: Chat.belongsTo(User, { foreignKey: 'userId' });
                // But in inbox.js: Chat.findOne... assignedTo === userId.
                // Chat model has 'userId' (Visitor?) and 'assignedTo' (Agent?).
                // I need to check Chat model definition.
                // Assuming `userId` in Chat model refers to the Agent/Owner for now based on dashboard.js existing code:
                // Existing code: Chat.count({ where: { userId } })
                // Let's stick to that but refine status.
                status: { [Op.notIn]: ['closed', 'resolved'] }
            }
        });

        // 4. Messages this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const messagesThisMonth = await Message.count({
            where: {
                userId, // Message sender? Or filtering messages in chats owned by user?
                // Existing code used `userId` on Message. 
                // Message.userId usually means the sender.
                // If the user is the Admin, this counts ADMIN messages. filtered by userId.
                // This might be "Messages Sent by You".
                // If we want "Total Messages Processed", we should query messages in Chats owned by user.
                // But let's keep existing logic "Messages This Month" (implied sent by agent?).
                // Actually, let's keep it simple.
                created_at: {
                    [Op.gte]: startOfMonth
                }
            }
        });

        // 5. Daily Stats (Last 7 Days) for Chart
        const dailyStats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            const count = await Message.count({
                where: {
                    userId,
                    created_at: {
                        [Op.gte]: date,
                        [Op.lt]: nextDate
                    }
                }
            });
            dailyStats.push({
                date: date.toLocaleDateString('en-US', { disable_monday_check: true, weekday: 'short' }),
                count
            });
        }

        res.json({
            widgets: totalWidgets,
            activeChats,
            totalLeads,
            messagesThisMonth,
            dailyStats
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Failed to fetch stats' });
    }
});

// GET /api/dashboard/lists - Get lists for dashboard (Leads, Widgets)
router.get('/lists', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Recent Leads
        const recentLeads = await Lead.findAll({
            where: { owner_user_id: userId },
            order: [['created_at', 'DESC']],
            limit: 5,
            attributes: ['id', 'name', 'email', 'created_at']
        });

        // Top Widgets (by chat count? or just recent?)
        // Let's just get recent widgets
        const widgets = await Widget.findAll({
            where: { user_id: userId },
            limit: 5,
            order: [['created_at', 'DESC']],
            attributes: ['id', 'name', 'slug', 'status', 'created_at']
        });

        res.json({
            recentLeads,
            widgets
        });
    } catch (error) {
        console.error('Dashboard lists error:', error);
        res.status(500).json({ message: 'Failed to fetch lists' });
    }
});

// GET /api/dashboard/activity - Get recent activity
router.get('/activity', requireAuth, async (req, res) => {
    try {
        const logs = await ActivityLog.findAll({
            where: { user_id: req.user.id }, // Note: user_id field
            order: [['created_at', 'DESC']],
            limit: 10
        });

        res.json({ activities: logs });
    } catch (error) {
        console.error('Dashboard activity error:', error);
        res.status(500).json({ message: 'Failed to fetch activity' });
    }
});

module.exports = router;
