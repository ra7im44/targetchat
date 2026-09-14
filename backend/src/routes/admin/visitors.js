const express = require('express');
const router = express.Router();
const { UserSession, User } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { Op, fn, col, literal } = require('sequelize');
const { parsePagination } = require('../../utils/pagination');

router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/visitors
 * Returns comprehensive session tracking, active users metrics, geo & device breakdowns
 */
router.get('/', async (req, res) => {
    try {
        const { search = '' } = req.query;
        const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });

        const now = new Date();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Metric Counters
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

        const totalToday = await UserSession.count({
            where: {
                created_at: { [Op.gte]: today }
            }
        });

        // 2. Build Where clause for sessions query
        const sessionWhere = {};
        const userWhere = {};

        if (search && search.trim()) {
            const s = search.trim();
            sessionWhere[Op.or] = [
                { ipAddress: { [Op.like]: `%${s}%` } },
                { deviceInfo: { [Op.like]: `%${s}%` } },
                { country: { [Op.like]: `%${s}%` } },
                { city: { [Op.like]: `%${s}%` } },
                { browser: { [Op.like]: `%${s}%` } },
                { os: { [Op.like]: `%${s}%` } },
                { '$user.name$': { [Op.like]: `%${s}%` } },
                { '$user.email$': { [Op.like]: `%${s}%` } }
            ];
        }

        // 3. Query Sessions List
        const { count, rows } = await UserSession.findAndCountAll({
            where: sessionWhere,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'role', 'avatar', 'isActive', 'created_at'],
                required: false
            }],
            order: [['last_activity', 'DESC']],
            limit,
            offset
        });

        // Enrich items with presence status
        const latestVisitors = rows.map(s => {
            const lastTime = new Date(s.lastActivity || s.created_at);
            const isOnline = lastTime >= fiveMinAgo;
            const isRecent = lastTime >= thirtyMinAgo;
            const presence = isOnline ? 'Online' : isRecent ? 'RecentlyActive' : 'Idle';

            return {
                sessionId: s.id,
                userId: s.userId,
                name: s.user ? s.user.name : 'Guest Visitor',
                email: s.user ? s.user.email : null,
                role: s.user ? s.user.role : 'visitor',
                avatar: s.user ? s.user.avatar : null,
                isUserActive: s.user ? s.user.isActive : true,
                ipAddress: s.ipAddress || '127.0.0.1',
                deviceInfo: s.deviceInfo || 'Unknown Device',
                deviceType: s.deviceType || 'desktop',
                browser: s.browser || 'Browser',
                os: s.os || 'OS',
                country: s.country || 'EG',
                city: s.city || 'Cairo',
                isSessionActive: s.isActive,
                createdAt: s.created_at,
                lastActivity: s.lastActivity,
                expiresAt: s.expiresAt,
                presence
            };
        });

        // 4. Aggregate Top Countries
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
            limit: 6,
            raw: true
        });

        const totalCountryCount = topCountriesRaw.reduce((sum, c) => sum + parseInt(c.count || 0), 0) || 1;
        const topCountries = topCountriesRaw.map(c => ({
            country: c.country,
            count: parseInt(c.count),
            percentage: Math.round((parseInt(c.count) / totalCountryCount) * 100)
        }));

        // 5. Aggregate Top Devices
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
            activeLast5Minutes,
            activeLoggedUsers,
            totalToday,
            topCountries,
            topDevices,
            latestVisitors,
            pagination: {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        console.error('Error in /api/admin/visitors:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

/**
 * POST /api/admin/visitors/clear
 * Clear expired or inactive tracking sessions
 */
router.post('/clear', async (req, res) => {
    try {
        const deleted = await UserSession.destroy({
            where: {
                isActive: false
            }
        });

        res.json({ message: 'Inactive sessions cleared', deletedCount: deleted });
    } catch (err) {
        console.error('Error clearing sessions:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
