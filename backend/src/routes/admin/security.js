const express = require('express');
const router = express.Router();
const { BlockedIP, User } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { refreshCache } = require('../../middleware/ipBlocker');

router.use(requireAuth, requireAdmin);

// GET /api/admin/security/ips - List blocked IPs
router.get('/ips', async (req, res) => {
    try {
        const blocks = await BlockedIP.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(blocks);
    } catch (err) {
        console.error('Error fetching blocked IPs:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/security/ips - Block an IP
router.post('/ips', async (req, res) => {
    try {
        const { ipAddress, reason } = req.body;

        if (!ipAddress) {
            return res.status(400).json({ message: 'IP Address is required' });
        }

        const existing = await BlockedIP.findOne({ where: { ipAddress } });
        if (existing) {
            return res.status(400).json({ message: 'IP is already blocked' });
        }

        const block = await BlockedIP.create({
            ipAddress,
            reason,
            blockedBy: req.user.id
        });

        // Refresh cache immediately
        await refreshCache();

        res.status(201).json(block);
    } catch (err) {
        console.error('Error blocking IP:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/security/ips/:id - Unblock IP
router.delete('/ips/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const block = await BlockedIP.findByPk(id);

        if (!block) {
            return res.status(404).json({ message: 'Block not found' });
        }

        await block.destroy();

        // Refresh cache immediately
        await refreshCache();

        res.json({ message: 'IP unblocked' });
    } catch (err) {
        console.error('Error unblocking IP:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
