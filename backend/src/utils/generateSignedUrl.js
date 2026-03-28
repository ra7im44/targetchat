const crypto = require('crypto');

const SECRET = process.env.FILE_SIGN_SECRET;
const EXPIRE_SECONDS = parseInt(process.env.FILE_URL_EXPIRE_SECONDS || '86400', 10); // 24 hours default

if (!SECRET) {
    console.warn('WARNING: FILE_SIGN_SECRET is not set in .env. Secure files will not work correctly.');
}

/**
 * Generates a signed URL for a given filename.
 * @param {string} filename - The name of the file in the uploads directory.
 * @returns {string} - The relative URL with signature and expiry.
 */
function generateSignedUrl(filename) {
    const expires = Math.floor(Date.now() / 1000) + EXPIRE_SECONDS;
    const dataToSign = `${filename}:${expires}`;
    const signature = crypto.createHmac('sha256', SECRET || 'default_secret')
        .update(dataToSign)
        .digest('hex');

    return `/secure-file/${filename}?expires=${expires}&signature=${signature}`;
}

/**
 * Verifies a signed URL.
 * @param {string} filename 
 * @param {string} expires 
 * @param {string} signature 
 * @returns {boolean}
 */
function verifySignedUrl(filename, expires, signature) {
    if (!filename || !expires || !signature) return false;

    const now = Math.floor(Date.now() / 1000);
    if (parseInt(expires, 10) < now) return false;

    const dataToSign = `${filename}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', SECRET || 'default_secret')
        .update(dataToSign)
        .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

module.exports = { generateSignedUrl, verifySignedUrl };
