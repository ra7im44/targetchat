/**
 * Centralised secret validation.
 *
 * SECURITY: Never fall back to a hardcoded/default secret. A predictable JWT or
 * file-signing secret allows full authentication bypass and signed-URL forgery.
 * We fail fast at startup (or at first use in non-production) instead.
 */

const PLACEHOLDER_SECRETS = new Set([
    'changeme_in_production',
    'change_this_secret',
    'default_secret',
    'super_secret_long_random_key_change_this_in_prod',
    'change_this_webhook_secret_in_production',
    'secret',
    'password'
]);

const MIN_SECRET_LENGTH = 32;

function assertStrongSecret(name, value, { minLength = MIN_SECRET_LENGTH } = {}) {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`[Security] ${name} is not configured. Refusing to start with a missing secret.`);
    }
    if (PLACEHOLDER_SECRETS.has(value)) {
        throw new Error(`[Security] ${name} is set to a known placeholder value. Generate a strong random secret.`);
    }
    // Enforce minimum length in production to avoid accidental weak deployments,
    // while allowing shorter (but non-default) secrets for local development.
    if (isProduction() && value.length < minLength) {
        throw new Error(`[Security] ${name} must be at least ${minLength} characters long in production.`);
    }
    return value;
}

function isProduction() {
    return process.env.NODE_ENV === 'production';
}

function getJwtSecret() {
    return assertStrongSecret('JWT_SECRET', process.env.JWT_SECRET);
}

function getFileSignSecret() {
    return assertStrongSecret('FILE_SIGN_SECRET', process.env.FILE_SIGN_SECRET);
}

module.exports = {
    assertStrongSecret,
    getJwtSecret,
    getFileSignSecret,
    isProduction,
    PLACEHOLDER_SECRETS,
    MIN_SECRET_LENGTH
};
