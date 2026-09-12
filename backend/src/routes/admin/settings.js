const express = require('express');
const router = express.Router();
const { Setting } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');

router.use(requireAuth, requireAdmin);

const DEFAULT_SETTINGS = [
    // General
    { section: 'general', key: 'app_name', value: 'TargetChat', type: 'string', description: 'Application display name', isPublic: true },
    { section: 'general', key: 'app_url', value: 'http://localhost:3000', type: 'string', description: 'Application public base URL', isPublic: true },
    { section: 'general', key: 'support_email', value: 'support@targetchat.com', type: 'string', description: 'Support contact email address', isPublic: true },
    { section: 'general', key: 'allow_registration', value: 'true', type: 'boolean', description: 'Allow new user registration', isPublic: true },
    { section: 'general', key: 'theme_primary_color', value: '#2563EB', type: 'string', description: 'Primary theme accent color (hex)', isPublic: true },
    { section: 'general', key: 'default_locale', value: 'en', type: 'string', description: 'Default system language / locale', isPublic: true },

    // AI & Intelligence
    { section: 'ai', key: 'default_model_provider', value: 'openai', type: 'string', description: 'Default AI model provider', isPublic: false },
    { section: 'ai', key: 'openai_api_key', value: '', type: 'password', description: 'OpenAI API key for direct processing', isPublic: false },
    { section: 'ai', key: 'n8n_webhook_url', value: process.env.N8N_WEBHOOK_URL || 'https://n8n.u-axis.com/webhook/targetchatv1123123234fe', type: 'string', description: 'Primary n8n AI Webhook Endpoint', isPublic: false },
    { section: 'ai', key: 'ai_thinking_indicator', value: 'true', type: 'boolean', description: 'Show AI thinking state to visitors', isPublic: true },
    { section: 'ai', key: 'ai_auto_handoff', value: 'true', type: 'boolean', description: 'Auto-handoff to human agent on AI error or explicit request', isPublic: false },

    // Features
    { section: 'features', key: 'enable_file_upload', value: 'true', type: 'boolean', description: 'Enable file and attachment uploads', isPublic: true },
    { section: 'features', key: 'enable_voice_notes', value: 'true', type: 'boolean', description: 'Enable audio voice note recording', isPublic: true },
    { section: 'features', key: 'enable_live_chat', value: 'true', type: 'boolean', description: 'Enable real-time guest webchat widgets', isPublic: true },
    { section: 'features', key: 'enable_canned_responses', value: 'true', type: 'boolean', description: 'Enable canned responses and quick shortcuts', isPublic: true },

    // Payment & Billing
    { section: 'payment', key: 'PAYPAL_MODE', value: process.env.PAYPAL_MODE || 'sandbox', type: 'string', description: 'PayPal Environment (sandbox or live)', isPublic: true },
    { section: 'payment', key: 'PAYPAL_CLIENT_ID', value: process.env.PAYPAL_CLIENT_ID || '', type: 'string', description: 'PayPal REST Client ID', isPublic: true },
    { section: 'payment', key: 'PAYPAL_SECRET', value: process.env.PAYPAL_SECRET || '', type: 'password', description: 'PayPal REST Client Secret', isPublic: false },
    { section: 'payment', key: 'PAYPAL_WEBHOOK_ID', value: process.env.PAYPAL_WEBHOOK_ID || '', type: 'string', description: 'PayPal Webhook ID for subscription events', isPublic: false },
    { section: 'payment', key: 'MOCK_BILLING_ENABLED', value: 'true', type: 'boolean', description: 'Enable instant mock payment activation for testing', isPublic: true },

    // Email
    { section: 'email', key: 'email_provider', value: process.env.EMAIL_PROVIDER || 'smtp', type: 'string', description: 'Email provider (smtp, sendgrid, ses)', isPublic: false },
    { section: 'email', key: 'smtp_host', value: process.env.SMTP_HOST || 'smtp.gmail.com', type: 'string', description: 'SMTP server hostname', isPublic: false },
    { section: 'email', key: 'smtp_port', value: process.env.SMTP_PORT || '587', type: 'string', description: 'SMTP server port', isPublic: false },
    { section: 'email', key: 'smtp_secure', value: process.env.SMTP_SECURE || 'false', type: 'boolean', description: 'Use TLS/SSL for SMTP', isPublic: false },
    { section: 'email', key: 'smtp_user', value: process.env.SMTP_USER || '', type: 'string', description: 'SMTP username / email', isPublic: false },
    { section: 'email', key: 'smtp_pass', value: process.env.SMTP_PASS || '', type: 'password', description: 'SMTP password or app token', isPublic: false },
    { section: 'email', key: 'email_from_name', value: 'TargetChat', type: 'string', description: 'Default sender display name', isPublic: false },
    { section: 'email', key: 'email_from_address', value: 'noreply@targetchat.com', type: 'string', description: 'Default sender email address', isPublic: false },

    // Integrations
    { section: 'integrations', key: 'meta_app_id', value: process.env.META_APP_ID || '', type: 'string', description: 'Meta / Facebook App ID', isPublic: true },
    { section: 'integrations', key: 'meta_app_secret', value: process.env.META_APP_SECRET || '', type: 'password', description: 'Meta / Facebook App Secret', isPublic: false },
    { section: 'integrations', key: 'meta_verify_token', value: process.env.META_VERIFY_TOKEN || '', type: 'password', description: 'Meta webhook verify token (must match Meta App Dashboard)', isPublic: false },
    { section: 'integrations', key: 'meta_system_user_token', value: process.env.META_SYSTEM_USER_TOKEN || '', type: 'password', description: 'Global WhatsApp Cloud system user token fallback', isPublic: false },
    { section: 'integrations', key: 'whatsapp_phone_number_id', value: process.env.WHATSAPP_PHONE_NUMBER_ID || '', type: 'string', description: 'WhatsApp Business Phone Number ID', isPublic: false },

    // Security
    { section: 'security', key: 'max_login_attempts', value: '5', type: 'string', description: 'Max failed login attempts before temporary lockout', isPublic: false },
    { section: 'security', key: 'jwt_expiry_hours', value: '24', type: 'string', description: 'JWT authentication token lifetime in hours', isPublic: false },
    { section: 'security', key: 'file_url_expire_seconds', value: process.env.FILE_URL_EXPIRE_SECONDS || '60', type: 'string', description: 'Signed private file URL expiry in seconds', isPublic: false },

    // System
    { section: 'system', key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Enable system-wide maintenance mode', isPublic: true }
];

async function ensureDefaultSettings() {
    for (const def of DEFAULT_SETTINGS) {
        await Setting.findOrCreate({
            where: { key: def.key },
            defaults: def
        });
    }
}

// GET /api/admin/settings - Get all settings grouped by section
router.get('/', async (req, res) => {
    try {
        // Ensure all default setting keys exist (findOrCreate preserves existing values)
        await ensureDefaultSettings();
        const settings = await Setting.findAll({
            order: [['section', 'ASC'], ['id', 'ASC']]
        });

        // Group by section
        const grouped = settings.reduce((acc, setting) => {
            if (!acc[setting.section]) {
                acc[setting.section] = [];
            }
            acc[setting.section].push(setting);
            return acc;
        }, {});

        res.json(grouped);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/admin/settings/seed-defaults - Force seed default settings
router.post('/seed-defaults', async (req, res) => {
    try {
        await ensureDefaultSettings();
        const settingsService = require('../../services/settingsService');
        await settingsService.refresh();
        res.json({ message: 'Default settings seeded successfully' });
    } catch (err) {
        console.error('Error seeding default settings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH /api/admin/settings - Bulk update settings
router.patch('/', async (req, res) => {
    try {
        const updates = req.body;

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
            } else {
                const def = DEFAULT_SETTINGS.find(d => d.key === key);
                const newSetting = await Setting.create({
                    key,
                    value: String(value),
                    section: def ? def.section : 'general',
                    type: def ? def.type : 'string',
                    description: def ? def.description : '',
                    isPublic: def ? def.isPublic : false
                });
                updatedSettings.push(newSetting);
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

// POST /api/admin/settings - Create new setting
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
            type: type || 'string',
            description,
            isPublic: !!isPublic
        });

        res.status(201).json(setting);
    } catch (err) {
        console.error('Error creating setting:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;

