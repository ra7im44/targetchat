const express = require('express');
const router = express.Router();
const { Setting } = require('../models');

// GET /api/settings/public - Get public settings
// Also maps to / (base route)
const getPublicSettings = async (req, res) => {
    try {
        const settings = await Setting.findAll({
            where: { isPublic: true },
            attributes: ['key', 'value', 'type', 'description']
        });

        // Convert array to object { key: value }
        const config = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});

        res.json(config);
    } catch (err) {
        console.error('Error fetching public settings:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

router.get('/public', getPublicSettings);
router.get('/', getPublicSettings);

module.exports = router;
