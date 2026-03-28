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
        res.json(channels);
    } catch (err) {
        console.error('Error fetching channels:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/channels - Create a new channel
router.post('/', async (req, res) => {
    try {
        const { type, name, externalId, accessToken, mode, workflowUrl } = req.body;

        const channel = await Channel.create({
            userId: req.user.id,
            type,
            name,
            externalId,
            accessToken,
            mode: mode || 'workflow',
            workflowUrl
        });

        res.status(201).json(channel);
    } catch (err) {
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

        await channel.update(req.body);
        res.json(channel);
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
