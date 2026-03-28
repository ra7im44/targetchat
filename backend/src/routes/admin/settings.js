const express = require('express');
const router = express.Router();
const { Setting } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');

// Public route to get public settings (e.g. app name, theme)
// This fits better in a public routes file, but for now we'll add it here 
// and handle the auth middleware carefully or create a separate public router.
// Actually, let's keep this file admin-only and create a separate public one if needed.

router.use(requireAuth, requireAdmin);

// GET /api/admin/settings - Get all settings grouped by section
router.get('/', async (req, res) => {
    try {
        console.log(`[DEBUG] Fetching settings for user: ${req.user?.id} (${req.user?.email})`);
        const settings = await Setting.findAll({
            order: [['section', 'ASC'], ['id', 'ASC']]
        });
        console.log(`[DEBUG] Found ${settings.length} total settings`);

        // Group by section
        const grouped = settings.reduce((acc, setting) => {
            if (!acc[setting.section]) {
                acc[setting.section] = [];
            }
            acc[setting.section].push(setting);
            return acc;
        }, {});

        console.log('[DEBUG] Grouped sections:', Object.keys(grouped));
        res.json(grouped);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH /api/admin/settings - Bulk update settings
router.patch('/', async (req, res) => {
    try {
        const updates = req.body; // Expect object: { key: value, key2: value2 }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ message: 'Invalid updates format' });
        }

        const keys = Object.keys(updates);
        const updatedSettings = [];

        for (const key of keys) {
            const value = updates[key];
            const setting = await Setting.findOne({ where: { key } });

            if (setting) {
                await setting.update({ value: String(value) });
                updatedSettings.push(setting);
            }
        }

        // Clear SettingsService cache
        const settingsService = require('../../services/settingsService');
        await settingsService.refresh();

        res.json({ message: 'Settings updated successfully', updated: updatedSettings.length });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/admin/settings - Create new setting (Dev only usually, but admin ui might allow it)
router.post('/', async (req, res) => {
    try {
        const { section, key, value, type, description, isPublic } = req.body;

        if (!key || !section) {
            return res.status(400).json({ message: 'Key and Section are required' });
        }

        const setting = await Setting.create({
            section,
            key,
            value: String(value),
            type,
            description,
            isPublic
        });

        res.status(201).json(setting);
    } catch (err) {
        console.error('Error creating setting:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
