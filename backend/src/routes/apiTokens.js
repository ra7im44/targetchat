const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { ApiToken } = require('../models');
const crypto = require('crypto');

// GET /api/api-keys - List API keys
router.get('/', requireAuth, async (req, res) => {
    try {
        const tokens = await ApiToken.findAll({
            where: { userId: req.user.id },
            order: [['created_at', 'DESC']],
            attributes: ['id', 'name', 'tokenPrefix', 'lastUsedAt', 'created_at'] // Don't return full hash
        });
        res.json({ keys: tokens });
    } catch (error) {
        console.error('List API keys error:', error);
        res.status(500).json({ message: 'Failed to list API keys' });
    }
});

// POST /api/api-keys - Create API key
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        // Generate token: tc_live_ + 32 random hex chars
        const randomBytes = crypto.randomBytes(24).toString('hex');
        const token = `tc_live_${randomBytes}`;

        // Hash token for storage
        // In a real app, use bcrypt or argon2. For simplicity here, we might store as is or simple hash.
        // The ApiToken model suggests `tokenHash`.
        // Let's use simple sha256 for now or just store it if that's what the model expects (checking model...)
        // Model has `tokenHash`.

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const apiToken = await ApiToken.create({
            userId: req.user.id,
            name,
            tokenPrefix: token.substring(0, 15) + '...', // Store prefix for display
            tokenHash: tokenHash,
            permissions: ['read', 'write']
        });

        // Return the FULL token only once
        res.status(201).json({
            message: 'API Key created',
            key: {
                id: apiToken.id,
                name: apiToken.name,
                token: token, // Show full token to user
                created_at: apiToken.created_at
            }
        });
    } catch (error) {
        console.error('Create API key error:', error);
        res.status(500).json({ message: 'Failed to create API key' });
    }
});

// DELETE /api/api-keys/:id - Revoke API key
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await ApiToken.destroy({
            where: {
                id,
                userId: req.user.id
            }
        });

        if (!result) {
            return res.status(404).json({ message: 'API Key not found' });
        }

        res.json({ message: 'API Key revoked' });
    } catch (error) {
        console.error('Revoke API key error:', error);
        res.status(500).json({ message: 'Failed to revoke API key' });
    }
});

module.exports = router;
