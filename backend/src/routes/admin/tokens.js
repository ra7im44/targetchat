const express = require('express');
const router = express.Router();
const { User, ApiToken } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const crypto = require('crypto');

router.use(requireAuth, requireAdmin);

// Utility to generate token
function generateToken(prefix = 'tc_live_') {
    const random = crypto.randomBytes(32).toString('hex');
    return `${prefix}${random}`;
}

// GET /api/admin/tokens - List all tokens
router.get('/', async (req, res) => {
    try {
        const tokens = await ApiToken.findAll({
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email']
            }],
            order: [['created_at', 'DESC']]
        });

        res.json(tokens.map(t => ({
            id: t.id,
            name: t.name,
            tokenPrefix: t.tokenPrefix,
            permissions: t.permissions,
            expiresAt: t.expiresAt,
            lastUsedAt: t.lastUsedAt,
            createdAt: t.createdAt,
            user: t.user
        })));
    } catch (err) {
        console.error('Error fetching tokens:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/tokens - Create new token
router.post('/', async (req, res) => {
    try {
        const { name, userId, expiresInDays, permissions } = req.body;

        if (!name || !userId) {
            return res.status(400).json({ message: 'Name and user ID are required' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate token
        const token = generateToken();
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const tokenPrefix = token.substring(0, 10) + '...';

        // Calculate expiration
        let expiresAt = null;
        if (expiresInDays && expiresInDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
        }

        const apiToken = await ApiToken.create({
            userId,
            name,
            tokenHash,
            tokenPrefix,
            permissions: permissions || ['read'],
            expiresAt
        });

        // Return the raw token ONLY ONCE
        res.status(201).json({
            id: apiToken.id,
            name: apiToken.name,
            token: token, // Raw token
            expiresAt: apiToken.expiresAt,
            user: { id: user.id, name: user.name }
        });
    } catch (err) {
        console.error('Error creating token:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// DELETE /api/admin/tokens/:id - Revoke token
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const token = await ApiToken.findByPk(id);

        if (!token) {
            return res.status(404).json({ message: 'Token not found' });
        }

        await token.destroy();
        res.json({ message: 'Token revoked successfully' });
    } catch (err) {
        console.error('Error revoking token:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
