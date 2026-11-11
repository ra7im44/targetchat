const express = require('express');
const router = express.Router();
const { Setting } = require('../models');

// Defense in depth: even if a row is flagged isPublic by mistake, only keys
// that are intentionally safe to expose may leave the server. Secrets and
// internal records can never appear here.
const PUBLIC_KEY_ALLOWLIST = new Set([
    'app_name',
    'app_url',
    'support_email',
    'allow_registration',
    'theme_primary_color',
    'enable_file_upload',
    'enable_voice_notes',
    'enable_live_chat',
    'enable_canned_responses',
    'maintenance_mode'
]);

// GET /api/settings/public - Get public settings
// Also maps to / (base route)
const getPublicSettings = async (req, res) => {
    try {
        const settings = await Setting.findAll({
            where: { isPublic: true },
            attributes: ['key', 'value', 'type', 'description']
        });
        const safeSettings = settings.filter((setting) => PUBLIC_KEY_ALLOWLIST.has(setting.key));

        // Convert array to object { key: value }
        const config = safeSettings.reduce((acc, setting) => {
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
