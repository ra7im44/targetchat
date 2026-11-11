'use strict';

const settingsService = require('./settingsService');

/**
 * Feature flags are stored in the settings table and enforced by the backend.
 * Hiding a button in the UI is not feature enforcement; every gated route must
 * call this module so a disabled feature is actually unavailable.
 */
const DEFAULTS = {
    enable_file_upload: true,
    enable_voice_notes: true,
    enable_live_chat: true,
    enable_canned_responses: true
};

function isEnabled(key) {
    if (!(key in DEFAULTS)) throw new Error(`Unknown feature flag: ${key}`);
    const raw = settingsService.getSync(key, DEFAULTS[key]);
    if (raw === false || raw === 0) return false;
    return !['false', '0', 'off', 'no'].includes(String(raw).toLowerCase());
}

function requireEnabled(key) {
    return (req, res, next) => {
        if (isEnabled(key)) return next();
        return res.status(403).json({
            error: 'feature_disabled',
            feature: key,
            message: 'This feature is disabled by the administrator'
        });
    };
}

module.exports = { DEFAULTS, isEnabled, requireEnabled };
