const express = require('express');
const router = express.Router();
const { User, sequelize } = require('../../models');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { Op } = require('sequelize');

// GET /api/admin/intelligence/ips - Get grouped IP data
router.get('/ips', requireAuth, requireAdmin, async (req, res) => {
    try {
        // Query for unique IPs and their counts (from both registration and last_ip)
        // We'll use a raw query or union for comprehensive overlap check across both fields

        const [results] = await sequelize.query(`
            SELECT ip, COUNT(DISTINCT user_id) as user_count
            FROM (
                SELECT registration_ip as ip, id as user_id FROM users WHERE registration_ip IS NOT NULL
                UNION ALL
                SELECT last_ip as ip, id as user_id FROM users WHERE last_ip IS NOT NULL
            ) combined_ips
            GROUP BY ip
            ORDER BY user_count DESC
            LIMIT 100
        `);

        res.json({ ips: results });
    } catch (err) {
        console.error('IP Intelligence Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/intelligence/ips/:ip - Get users for a specific IP
router.get('/ips/:ip', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { ip } = req.params;

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { registrationIp: ip },
                    { lastIp: ip }
                ]
            },
            attributes: ['id', 'name', 'email', 'role', 'lastLogin', 'registrationIp', 'lastIp', 'isVerified', 'isActive']
        });

        res.json({ users });
    } catch (err) {
        console.error('IP User Lookup Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
