const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { UserPreference } = require('../models');

// GET /api/user/preferences - Get user preferences
router.get('/preferences', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        let preferences = await UserPreference.findOne({ where: { userId } });

        // Create default preferences if they don't exist
        if (!preferences) {
            preferences = await UserPreference.create({
                userId,
                language: 'en',
                timezone: 'UTC',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h',
                theme: 'system',
                accentColor: '#3B82F6',
                fontSize: 'medium'
            });
        }

        res.json(preferences);
    } catch (err) {
        console.error('Error fetching preferences:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/user/preferences - Update user preferences
router.patch('/preferences', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Validate allowed fields
        const allowedFields = ['language', 'timezone', 'dateFormat', 'timeFormat', 'theme', 'accentColor', 'fontSize'];
        const filteredUpdates = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        }

        let preferences = await UserPreference.findOne({ where: { userId } });

        if (!preferences) {
            // Create with updates
            preferences = await UserPreference.create({
                userId,
                ...filteredUpdates
            });
        } else {
            // Update existing
            await preferences.update(filteredUpdates);
        }

        res.json(preferences);
    } catch (err) {
        console.error('Error updating preferences:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
