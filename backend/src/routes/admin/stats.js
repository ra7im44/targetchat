const express = require('express');
const router = express.Router();
const { sequelize, User, UserSession, Chat, Message, Workflow } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { Op, fn, col, literal } = require('sequelize');

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

        // Session & Demographics Stats
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeLast5Minutes = await UserSession.count({
            where: {
                isActive: true,
                lastActivity: { [Op.gte]: fiveMinAgo }
            }
        });

        const activeLoggedUsers = await UserSession.count({
            distinct: true,
            col: 'user_id',
            where: {
                isActive: true
            }
        });

        const totalSessionsToday = await UserSession.count({
            where: {
                created_at: { [Op.gte]: today }
            }
        });

        // Top Countries
        const topCountriesRaw = await UserSession.findAll({
            attributes: [
                'country',
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                country: { [Op.ne]: null }
            },
            group: ['country'],
            order: [[literal('count'), 'DESC']],
            limit: 5,
            raw: true
        });
        const totalCountryCount = topCountriesRaw.reduce((sum, c) => sum + parseInt(c.count || 0), 0) || 1;
        const topCountries = topCountriesRaw.map(c => ({
            country: c.country,
            count: parseInt(c.count),
            percentage: Math.round((parseInt(c.count) / totalCountryCount) * 100)
        }));

        // Top Devices
        const topDevicesRaw = await UserSession.findAll({
            attributes: [
                'os',
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                os: { [Op.ne]: null }
            },
            group: ['os'],
            order: [[literal('count'), 'DESC']],
            limit: 5,
            raw: true
        });
        const totalDeviceCount = topDevicesRaw.reduce((sum, d) => sum + parseInt(d.count || 0), 0) || 1;
        const topDevices = topDevicesRaw.map(d => ({
            device: d.os || 'Unknown',
            count: parseInt(d.count),
            percentage: Math.round((parseInt(d.count) / totalDeviceCount) * 100)
        }));

        res.json({
            users: {
                total: totalUsers,
                active: activeUsers,
                newThisWeek: newUsers,
                activeLast5Minutes,
                activeLoggedUsers,
                totalSessionsToday
            },
            demographics: {
                topCountries,
                topDevices
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

// GET /api/admin/stats/traffic - Get historical message traffic for timeframe
router.get('/traffic', async (req, res) => {
    try {
        const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - (days - 1));

        // Build list of all dates in the range
        const dateMap = {};
        const resultList = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const isoDate = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', {
                month: days > 14 ? 'numeric' : 'short',
                day: 'numeric',
                ...(days <= 7 ? { weekday: 'short' } : {})
            });
            dateMap[isoDate] = 0;
            resultList.push({ dateStr: isoDate, label });
        }

        // Query grouped counts from Message table
        const messages = await Message.findAll({
            attributes: [
                [sequelize.fn('date', sequelize.col('created_at')), 'msgDate'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                created_at: { [Op.gte]: startDate }
            },
            group: [sequelize.fn('date', sequelize.col('created_at'))],
            raw: true
        });

        messages.forEach(m => {
            const dStr = m.msgDate;
            if (dateMap.hasOwnProperty(dStr)) {
                dateMap[dStr] = parseInt(m.count) || 0;
            }
        });

        const finalData = resultList.map(item => ({
            date: item.label,
            dateStr: item.dateStr,
            count: dateMap[item.dateStr] || 0
        }));

        res.json({
            days,
            data: finalData
        });
    } catch (err) {
        console.error('Error fetching traffic stats:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
