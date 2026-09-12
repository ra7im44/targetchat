const express = require('express');
const router = express.Router();
const { Channel } = require('../models');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/channels - List user's channels
router.get('/', async (req, res) => {
    try {
        const channels = await Channel.findAll({
            where: { userId: req.user.id },
            order: [['created_at', 'DESC']]
        });
        // SECURITY: never expose stored provider access tokens; the UI only
        // needs to know whether one is configured.
        res.json(channels.map(c => {
            const safe = c.toJSON();
            safe.hasToken = !!safe.accessToken;
            delete safe.accessToken;
            return safe;
        }));
    } catch (err) {
        console.error('Error fetching channels:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/channels - Create a new channel
router.post('/', async (req, res) => {
    try {
        const { type, name, externalId, accessToken, mode, workflowUrl } = req.body;

        // Validate required fields (Sequelize would otherwise throw a raw 500).
        const validTypes = ['whatsapp', 'facebook', 'instagram'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid channel type' });
        }
        if (!name || typeof name !== 'string' || !externalId || typeof externalId !== 'string') {
            return res.status(400).json({ message: 'Name and external ID are required' });
        }

        const channel = await Channel.create({
            userId: req.user.id,
            type,
            name: name.trim(),
            externalId: externalId.trim(),
            accessToken,
            mode: mode || 'workflow',
            workflowUrl
        });

        // Never return the stored access token to the client.
        const safe = channel.toJSON();
        delete safe.accessToken;
        res.status(201).json(safe);
    } catch (err) {
        // Friendly message when the same account is connected twice.
        if (err && err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'This account is already connected' });
        }
        console.error('Error creating channel:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH /api/channels/:id - Update channel settings
router.patch('/:id', async (req, res) => {
    try {
        const channel = await Channel.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // SECURITY: allowlist — never accept userId/id or other internal fields.
        // An empty accessToken means "keep the existing one" (the list API no
        // longer returns tokens, so edit forms submit a blank field).
        const { type, name, externalId, accessToken, mode, workflowUrl, isActive } = req.body;
        const updates = {};
        if (type !== undefined) updates.type = type;
        if (name !== undefined) updates.name = name;
        if (externalId !== undefined) updates.externalId = externalId;
        if (typeof accessToken === 'string' && accessToken.length > 0) updates.accessToken = accessToken;
        if (mode !== undefined) updates.mode = mode;
        if (workflowUrl !== undefined) updates.workflowUrl = workflowUrl;
        if (isActive !== undefined) updates.isActive = isActive;

        await channel.update(updates);
        // Never return the stored access token to the client.
        const safe = channel.toJSON();
        delete safe.accessToken;
        res.json(safe);
    } catch (err) {
        console.error('Error updating channel:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// DELETE /api/channels/:id - Delete a channel
router.delete('/:id', async (req, res) => {
    try {
        const result = await Channel.destroy({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!result) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        res.json({ message: 'Channel deleted successfully' });
    } catch (err) {
        console.error('Error deleting channel:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
