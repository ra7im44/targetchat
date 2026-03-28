const express = require('express');
const router = express.Router();
const { Channel, Message } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');

router.use(requireAuth, requireAdmin);

const maskValue = (val) => {
    if (!val) return 'Not Set';
    if (val.length < 8) return '********';
    return val.substring(0, 3) + '***' + val.substring(val.length - 3);
};

// GET /api/admin/channels/stats - System-wide stats
router.get('/stats', async (req, res) => {
    try {
        const totalChannels = await Channel.count();
        const activeChannels = await Channel.count({ where: { isActive: true } });

        // Mocking some stats for now as we don't have a logs table specifically for webhooks yet
        const messagesProcessed = await Message.count(); // Total messages as a proxy for activity

        res.json({
            totalChannels,
            activeChannels,
            activeWebhooks: 3, // Meta, WhatsApp, System
            healthyTokens: activeChannels,
            messagesProcessed,
            config: {
                appId: maskValue(process.env.FACEBOOK_APP_ID),
                verifyToken: maskValue(process.env.META_VERIFY_TOKEN),
                systemToken: maskValue(process.env.META_SYSTEM_USER_TOKEN)
            }
        });
    } catch (err) {
        console.error('Error fetching channel stats:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/admin/channels - System-wide list (Optional for superadmin)
router.get('/', async (req, res) => {
    try {
        const channels = await Channel.findAll({
            include: ['user'],
            order: [['created_at', 'DESC']]
        });
        res.json(channels);
    } catch (err) {
        console.error('Error fetching all channels:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
