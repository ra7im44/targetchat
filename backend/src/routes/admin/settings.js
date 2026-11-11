const express = require('express');
const router = express.Router();
const { Setting, sequelize } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const settingsService = require('../../services/settingsService');
const registry = require('../../services/ai/registry');

router.use(requireAuth, requireAdmin);

// SECURITY: internal system records (immutable upload ownership, OAuth replay
// JTIs) live in the settings TABLE but are not admin-editable configuration.
// They must never be listed, edited, or created through this route — exposing
// them would let a compromised admin session rewrite file ownership or clear
// replay protection. (admin/files.js manages ownership rows on its own screen.)
const INTERNAL_SECTIONS = new Set(['upload_ownership', 'oauth_consumed_jti']);
const INTERNAL_KEY_PREFIXES = ['upload_ownership_'];
// Retired keys that no runtime consumes. They stay in old databases but are
// hidden from the UI and rejected on write so no dead control is displayed.
const LEGACY_KEYS = new Set([
    'default_model_provider',
    'ai_thinking_indicator',
    'ai_auto_handoff',
    'default_locale',
    '__versions'
]);

function isInternalSetting(setting) {
    return INTERNAL_SECTIONS.has(setting.section)
        || INTERNAL_KEY_PREFIXES.some(prefix => String(setting.key).startsWith(prefix));
}

const DEFAULT_SETTINGS = [
    // General
    { section: 'general', key: 'app_name', value: 'TargetChat', type: 'string', description: 'Application display name', isPublic: true },
    { section: 'general', key: 'app_url', value: process.env.FRONTEND_URL || 'http://localhost:3000', type: 'string', description: 'Public base URL used in emails and generated links', isPublic: true },
    { section: 'general', key: 'support_email', value: 'support@targetchat.com', type: 'string', description: 'Support contact address', isPublic: true },
    { section: 'general', key: 'allow_registration', value: 'true', type: 'boolean', description: 'Allow new user registration', isPublic: true },
    { section: 'general', key: 'theme_primary_color', value: '#5B5BD6', type: 'string', description: 'Primary brand colour (hex)', isPublic: true },

    // AI & Intelligence
    { section: 'ai', key: 'ai_enabled', value: 'true', type: 'boolean', description: 'Master switch for AI replies', isPublic: false },
    { section: 'ai', key: 'ai_provider', value: 'ollama', type: 'string', description: 'Provider: ollama, openai, anthropic, gemini, groq, deepseek', isPublic: false },
    { section: 'ai', key: 'ai_model', value: 'qwen2.5:3b', type: 'string', description: 'Model tag for the selected provider', isPublic: false },
    { section: 'ai', key: 'ollama_base_url', value: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434', type: 'string', description: 'Local Ollama endpoint', isPublic: false },
    { section: 'ai', key: 'ai_system_prompt', value: '', type: 'textarea', description: 'Extra system instructions applied to every reply', isPublic: false },
    { section: 'ai', key: 'ai_temperature', value: '0.7', type: 'number', description: 'Sampling temperature (0–2)', isPublic: false },
    { section: 'ai', key: 'ai_max_tokens', value: '700', type: 'number', description: 'Maximum generated tokens', isPublic: false },
    { section: 'ai', key: 'ai_request_timeout_ms', value: '120000', type: 'number', description: 'Provider request timeout in milliseconds', isPublic: false },
    { section: 'ai', key: 'ai_streaming_enabled', value: 'true', type: 'boolean', description: 'Stream tokens to the interface', isPublic: false },
    { section: 'ai', key: 'ai_allow_fallback', value: 'false', type: 'boolean', description: 'Allow canned fallback replies when every provider fails', isPublic: false },
    { section: 'ai', key: 'ai_fallback_order', value: '', type: 'string', description: 'Comma-separated fallback providers (blank disables)', isPublic: false },
    { section: 'ai', key: 'openai_api_key', value: '', type: 'password', description: 'OpenAI API key (optional)', isPublic: false },
    { section: 'ai', key: 'n8n_webhook_url', value: process.env.N8N_WEBHOOK_URL || '', type: 'string', description: 'Optional n8n AI webhook', isPublic: false },

    // Features
    { section: 'features', key: 'enable_file_upload', value: 'true', type: 'boolean', description: 'Enable file and attachment uploads', isPublic: true },
    { section: 'features', key: 'enable_voice_notes', value: 'true', type: 'boolean', description: 'Enable audio voice notes', isPublic: true },
    { section: 'features', key: 'enable_live_chat', value: 'true', type: 'boolean', description: 'Enable public guest chat widgets', isPublic: true },
    { section: 'features', key: 'enable_canned_responses', value: 'true', type: 'boolean', description: 'Enable canned responses', isPublic: true },

    // Payment & Billing
    { section: 'payment', key: 'PAYPAL_MODE', value: process.env.PAYPAL_MODE || 'sandbox', type: 'string', description: 'PayPal environment (sandbox or live)', isPublic: false },
    { section: 'payment', key: 'PAYPAL_CLIENT_ID', value: process.env.PAYPAL_CLIENT_ID || '', type: 'string', description: 'PayPal REST client ID', isPublic: false },
    { section: 'payment', key: 'PAYPAL_SECRET', value: process.env.PAYPAL_SECRET || '', type: 'password', description: 'PayPal REST client secret', isPublic: false },
    { section: 'payment', key: 'PAYPAL_WEBHOOK_ID', value: process.env.PAYPAL_WEBHOOK_ID || '', type: 'string', description: 'PayPal webhook ID for subscription events', isPublic: false },
    { section: 'payment', key: 'MOCK_BILLING_ENABLED', value: 'false', type: 'boolean', description: 'Enable mock activation (requires ALLOW_MOCK_BILLING and non-production)', isPublic: false },

    // Email
    { section: 'email', key: 'email_enabled', value: 'true', type: 'boolean', description: 'Master switch for outbound email', isPublic: false },
    { section: 'email', key: 'email_provider', value: process.env.EMAIL_PROVIDER || 'smtp', type: 'string', description: 'Provider: smtp, sendgrid, ses, console', isPublic: false },
    { section: 'email', key: 'smtp_host', value: process.env.SMTP_HOST || 'smtp.gmail.com', type: 'string', description: 'SMTP hostname', isPublic: false },
    { section: 'email', key: 'smtp_port', value: process.env.SMTP_PORT || '587', type: 'number', description: 'SMTP port', isPublic: false },
    { section: 'email', key: 'smtp_secure', value: process.env.SMTP_SECURE || 'false', type: 'boolean', description: 'Use implicit TLS (port 465)', isPublic: false },
    { section: 'email', key: 'smtp_user', value: process.env.SMTP_USER || '', type: 'string', description: 'SMTP username', isPublic: false },
    { section: 'email', key: 'smtp_pass', value: process.env.SMTP_PASS || '', type: 'password', description: 'SMTP password or app token', isPublic: false },
    { section: 'email', key: 'email_from_name', value: 'TargetChat', type: 'string', description: 'Default sender name', isPublic: false },
    { section: 'email', key: 'email_from_address', value: 'noreply@targetchat.com', type: 'string', description: 'Default sender address', isPublic: false },

    // Integrations
    { section: 'integrations', key: 'meta_app_id', value: process.env.META_APP_ID || '', type: 'string', description: 'Meta app ID', isPublic: false },
    { section: 'integrations', key: 'meta_app_secret', value: process.env.META_APP_SECRET || '', type: 'password', description: 'Meta app secret', isPublic: false },
    { section: 'integrations', key: 'meta_verify_token', value: process.env.META_VERIFY_TOKEN || '', type: 'password', description: 'Meta webhook verify token', isPublic: false },
    { section: 'integrations', key: 'meta_system_user_token', value: process.env.META_SYSTEM_USER_TOKEN || '', type: 'password', description: 'WhatsApp Cloud system user token', isPublic: false },
    { section: 'integrations', key: 'whatsapp_phone_number_id', value: process.env.WHATSAPP_PHONE_NUMBER_ID || '', type: 'string', description: 'WhatsApp Business phone number ID', isPublic: false },

    // Security
    { section: 'security', key: 'max_login_attempts', value: '5', type: 'number', description: 'Failed logins before a temporary lockout', isPublic: false },
    { section: 'security', key: 'jwt_expiry_hours', value: '24', type: 'number', description: 'JWT lifetime in hours', isPublic: false },
    { section: 'security', key: 'file_url_expire_seconds', value: process.env.FILE_URL_EXPIRE_SECONDS || '86400', type: 'number', description: 'Signed private file URL lifetime in seconds', isPublic: false },

    // System
    { section: 'system', key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Return 503 for non-admin API traffic', isPublic: true }
];

const DEFAULT_BY_KEY = new Map(DEFAULT_SETTINGS.map((def) => [def.key, def]));
const SECRET_KEY_RE = /(secret|password|passwd|api_key|private_key|system_user_token|verify_token|_pass$)/i;

function isSecret(def, setting) {
    const type = (setting && setting.type) || (def && def.type) || 'string';
    const key = (setting && setting.key) || (def && def.key) || '';
    return type === 'password' || SECRET_KEY_RE.test(key);
}

function serialize(setting) {
    const secret = isSecret(DEFAULT_BY_KEY.get(setting.key), setting);
    const raw = setting.value === null || setting.value === undefined ? '' : String(setting.value);
    return {
        id: setting.id,
        section: setting.section,
        key: setting.key,
        value: secret ? '' : raw,
        hasValue: raw.length > 0,
        secret,
        type: setting.type,
        description: setting.description,
        isPublic: Boolean(setting.isPublic),
        version: setting.updated_at ? new Date(setting.updated_at).toISOString() : null
    };
}

async function ensureDefaultSettings() {
    // Artifact from an earlier client bug: a form field was saved as a setting.
    // It can never be a legitimate key, so remove it instead of displaying it.
    await Setting.destroy({ where: { key: '__versions' } });
    for (const def of DEFAULT_SETTINGS) {
        await Setting.findOrCreate({ where: { key: def.key }, defaults: def });
    }
}

const NUMBER_RULES = {
    max_login_attempts: { min: 1, max: 100, integer: true },
    jwt_expiry_hours: { min: 1, max: 720, integer: true },
    file_url_expire_seconds: { min: 60, max: 604800, integer: true },
    ai_temperature: { min: 0, max: 2, integer: false },
    ai_max_tokens: { min: 1, max: 32768, integer: true },
    ai_request_timeout_ms: { min: 1000, max: 600000, integer: true },
    smtp_port: { min: 1, max: 65535, integer: true }
};

const URL_KEYS = new Set(['app_url', 'ollama_base_url', 'n8n_webhook_url']);
const EMAIL_KEYS = new Set(['support_email', 'email_from_address']);
const REQUIRED_KEYS = new Set(['app_name', 'app_url', 'email_from_address', 'smtp_host']);

function validateValue(key, raw, def) {
    const value = raw === null || raw === undefined ? '' : String(raw);
    if (value.length > 8000) return { error: 'Value is too long' };

    if (REQUIRED_KEYS.has(key) && !value.trim()) return { error: 'This field is required' };

    if (def && def.type === 'boolean') {
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
            return { error: 'Expected true or false' };
        }
        return { value: ['true', '1'].includes(value.toLowerCase()) ? 'true' : 'false' };
    }

    if (def && def.type === 'number' || NUMBER_RULES[key]) {
        const rule = NUMBER_RULES[key] || { min: -Infinity, max: Infinity, integer: false };
        const num = Number(value);
        if (!Number.isFinite(num)) return { error: 'Expected a number' };
        if (rule.integer && !Number.isInteger(num)) return { error: 'Expected a whole number' };
        if (num < rule.min || num > rule.max) {
            return { error: `Must be between ${rule.min} and ${rule.max}` };
        }
        return { value: String(num) };
    }

    if (URL_KEYS.has(key)) {
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
        } catch {
            return { error: 'Expected an http(s) URL' };
        }
    }

    if (EMAIL_KEYS.has(key) && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { error: 'Expected an email address' };
    }

    if (key === 'theme_primary_color' && !/^#[0-9a-f]{6}$/i.test(value)) {
        return { error: 'Expected a 6-digit hex colour, e.g. #5B5BD6' };
    }

    if (key === 'ai_provider' && !registry.DEFINITIONS[value.toLowerCase()]) {
        return { error: `Unknown provider. Use one of: ${Object.keys(registry.DEFINITIONS).join(', ')}` };
    }

    if (key === 'PAYPAL_MODE' && !['sandbox', 'live'].includes(value.toLowerCase())) {
        return { error: 'Expected sandbox or live' };
    }

    if (key === 'email_provider' && !['smtp', 'sendgrid', 'ses', 'console'].includes(value.toLowerCase())) {
        return { error: 'Expected smtp, sendgrid, ses, or console' };
    }

    if (key === 'ai_fallback_order') {
        const ids = value.split(',').map((s) => s.trim()).filter(Boolean);
        const unknown = ids.filter((id) => !registry.DEFINITIONS[id.toLowerCase()]);
        if (unknown.length) return { error: `Unknown providers: ${unknown.join(', ')}` };
        return { value: ids.join(',') };
    }

    return { value };
}

async function applyRuntime(changedKeys) {
    await settingsService.refresh();
    const keys = new Set(changedKeys);
    const aiChanged = [...keys].some((k) => k.startsWith('ai_') || k === 'ollama_base_url' || k === 'openai_api_key');
    if (aiChanged) {
        registry.resetCache();
        const aiService = require('../../services/aiService');
        if (typeof aiService.invalidateSettings === 'function') aiService.invalidateSettings();
    }
    const emailChanged = [...keys].some((k) => k.startsWith('smtp_') || k.startsWith('email_'));
    if (emailChanged) {
        const emailProvider = require('../../services/emailProvider');
        await emailProvider.reload();
    }
}

// GET /api/admin/settings — all editable settings, grouped, secrets masked.
router.get('/', async (req, res) => {
    try {
        await ensureDefaultSettings();
        const settings = (await Setting.findAll({
            order: [['section', 'ASC'], ['id', 'ASC']]
        })).filter((s) => !isInternalSetting(s) && !LEGACY_KEYS.has(s.key));

        const grouped = settings.reduce((acc, setting) => {
            if (!acc[setting.section]) acc[setting.section] = [];
            acc[setting.section].push(serialize(setting));
            return acc;
        }, {});

        res.set('Cache-Control', 'no-store');
        res.json(grouped);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/admin/settings/seed-defaults — create missing keys only.
router.post('/seed-defaults', async (req, res) => {
    try {
        await ensureDefaultSettings();
        await settingsService.refresh();
        res.json({ message: 'Missing default settings created' });
    } catch (err) {
        console.error('Error seeding default settings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/admin/settings/reset — restore defaults for one section.
// Secrets are never reset unless explicitly requested, and internal records
// and unrelated sections are never touched.
router.post('/reset', async (req, res) => {
    try {
        const { section, confirm, includeSecrets = false } = req.body || {};
        if (confirm !== true) {
            return res.status(400).json({ message: 'Reset requires explicit confirmation' });
        }
        if (!section) {
            return res.status(400).json({ message: 'A section is required (use "all" for every section)' });
        }

        const targets = DEFAULT_SETTINGS.filter((def) =>
            (section === 'all' || def.section === section)
            && !INTERNAL_SECTIONS.has(def.section)
        );
        if (!targets.length) return res.status(400).json({ message: 'Unknown section' });

        const reset = [];
        const preserved = [];
        await sequelize.transaction(async (transaction) => {
            for (const def of targets) {
                if (isSecret(def) && !includeSecrets) {
                    preserved.push(def.key);
                    continue;
                }
                const [setting] = await Setting.findOrCreate({
                    where: { key: def.key },
                    defaults: def,
                    transaction
                });
                if (!setting.isNewRecord) {
                    await setting.update({ value: String(def.value) }, { transaction });
                }
                reset.push(def.key);
            }
        });

        await applyRuntime(reset);
        res.json({
            message: `Reset ${reset.length} setting${reset.length === 1 ? '' : 's'}`,
            reset,
            preservedSecrets: preserved
        });
    } catch (err) {
        console.error('Error resetting settings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH /api/admin/settings — validated, transactional bulk update.
router.patch('/', async (req, res) => {
    try {
        const body = req.body || {};
        const versions = body.__versions && typeof body.__versions === 'object' ? body.__versions : {};
        const updates = Object.fromEntries(
            Object.entries(body).filter(([key]) => key !== '__versions')
        );
        const keys = Object.keys(updates);

        if (!keys.length) return res.status(400).json({ message: 'No settings provided' });
        if (keys.some((key) => !/^[A-Za-z0-9_]{1,64}$/.test(key))) {
            return res.status(400).json({ message: 'Invalid setting key' });
        }

        const existing = await Setting.findAll({ where: { key: keys } });
        const existingByKey = new Map(existing.map((s) => [s.key, s]));

        const blocked = existing.find(isInternalSetting);
        if (blocked) {
            return res.status(403).json({ message: `Setting '${blocked.key}' is a protected system record` });
        }
        if (keys.some((key) => LEGACY_KEYS.has(key))) {
            return res.status(403).json({ message: 'This key is retired and cannot be modified' });
        }

        const unknown = keys.filter((key) => !DEFAULT_BY_KEY.has(key) && !existingByKey.has(key));
        if (unknown.length) {
            return res.status(400).json({
                message: `Unknown setting(s): ${unknown.join(', ')}`,
                error: 'unknown_setting'
            });
        }

        const errors = {};
        const planned = [];

        for (const key of keys) {
            const current = existingByKey.get(key);
            const def = DEFAULT_BY_KEY.get(key) || (current ? {
                key, type: current.type, section: current.section
            } : null);

            if (versions[key] && current && current.updated_at) {
                const actual = new Date(current.updated_at).toISOString();
                if (String(versions[key]) !== actual) {
                    errors[key] = 'This setting changed since the page loaded. Reload before saving.';
                    continue;
                }
            }

            const raw = updates[key];
            const secret = isSecret(def, current);

            // A blank secret means "keep the stored value": the API never
            // returns secrets, so the form cannot repopulate them.
            if (secret && (raw === '' || raw === null || raw === undefined || /^•+$/.test(String(raw)))) {
                continue;
            }

            const result = validateValue(key, raw, def);
            if (result.error) {
                errors[key] = result.error;
                continue;
            }
            planned.push({ key, value: result.value, current, def });
        }

        if (Object.keys(errors).length) {
            return res.status(400).json({ message: 'Validation failed', error: 'validation_failed', errors });
        }

        await sequelize.transaction(async (transaction) => {
            for (const item of planned) {
                if (item.current) {
                    await item.current.update({ value: item.value }, { transaction });
                } else {
                    await Setting.create({
                        key: item.key,
                        value: item.value,
                        section: item.def.section || 'general',
                        type: item.def.type || 'string',
                        description: item.def.description || '',
                        isPublic: item.def.isPublic || false
                    }, { transaction });
                }
            }
        });

        await applyRuntime(planned.map((item) => item.key));

        res.json({
            message: 'Settings saved',
            updated: planned.length,
            changed: planned.map((item) => item.key)
        });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/admin/settings/status — real runtime state, not stored credentials.
router.get('/status', async (req, res) => {
    try {
        const aiService = require('../../services/aiService');
        const emailProvider = require('../../services/emailProvider');
        const ai = typeof aiService.status === 'function' ? await aiService.status({ force: true }) : null;

        let email;
        try {
            email = await emailProvider.status();
        } catch (err) {
            email = { provider: null, configured: false, verified: false, error: err.message };
        }

        const value = async (key) => settingsService.get(key, null);
        const [metaId, metaSecret, verifyToken, whatsapp, n8nUrl, paypalId, paypalSecret, stripeKey] = await Promise.all([
            value('meta_app_id'), value('meta_app_secret'), value('meta_verify_token'),
            value('whatsapp_phone_number_id'), value('n8n_webhook_url'),
            value('PAYPAL_CLIENT_ID'), value('PAYPAL_SECRET'), value('STRIPE_SECRET_KEY')
        ]);

        res.set('Cache-Control', 'no-store');
        res.json({
            ai,
            email,
            integrations: {
                n8n: { configured: Boolean(n8nUrl) },
                meta: { configured: Boolean(metaId && metaSecret && verifyToken) },
                whatsapp: { configured: Boolean(whatsapp) }
            },
            payment: {
                paypal: { configured: Boolean(paypalId && paypalSecret) },
                stripe: { configured: Boolean(stripeKey) },
                mockBillingSetting: Boolean(await value('MOCK_BILLING_ENABLED'))
            },
            maintenance: Boolean(await value('maintenance_mode'))
        });
    } catch (err) {
        console.error('Error reading settings status:', err);
        res.status(500).json({ message: 'Failed to read runtime status' });
    }
});

// POST /api/admin/settings/email/test — sends a real message through the
// configured provider. Secrets are never returned to the client.
router.post('/email/test', async (req, res) => {
    try {
        const to = String((req.body && req.body.to) || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            return res.status(400).json({ message: 'A valid recipient address is required' });
        }

        const emailProvider = require('../../services/emailProvider');
        await emailProvider.reload();
        if (!emailProvider.initialized) await emailProvider.loadSettings();

        const fromAddress = await settingsService.get('email_from_address', 'noreply@targetchat.com');
        const fromName = await settingsService.get('email_from_name', 'TargetChat');
        const result = await emailProvider.send({
            from: `"${fromName}" <${fromAddress}>`,
            to,
            subject: 'TargetChat SMTP test',
            html: '<p>This is a test message from TargetChat System Settings.</p>',
            text: 'This is a test message from TargetChat System Settings.'
        });

        res.json({
            ok: true,
            provider: result.provider,
            messageId: result.messageId || null,
            note: result.provider === 'console'
                ? 'Console provider logs messages instead of delivering them.'
                : undefined
        });
    } catch (err) {
        console.error('Email test failed:', err.message);
        res.status(502).json({ message: `Email delivery failed: ${err.message}` });
    }
});

module.exports = router;
