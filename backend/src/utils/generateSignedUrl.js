const crypto = require('crypto');
const { getFileSignSecret } = require('../config/secrets');

const EXPIRE_SECONDS = parseInt(process.env.FILE_URL_EXPIRE_SECONDS || '86400', 10); // 24 hours default

/**
 * Generates a signed URL for a given filename.
 * @param {string} filename - The name of the file in the uploads directory.
 * @param {string|number|null} [userId] - Optional user ID to bind ownership.
 * @returns {string} - The relative URL with signature and expiry.
 */
function generateSignedUrl(filename, userId = null) {
    const secret = getFileSignSecret();
    const expires = Math.floor(Date.now() / 1000) + EXPIRE_SECONDS;
    const uidStr = (userId !== null && userId !== undefined && userId !== '') ? String(userId) : '';
    const dataToSign = uidStr ? `${filename}:${expires}:${uidStr}` : `${filename}:${expires}`;
    const signature = crypto.createHmac('sha256', secret)
        .update(dataToSign)
        .digest('hex');

    const uidParam = uidStr ? `&uid=${encodeURIComponent(uidStr)}` : '';
    return `/secure-file/${filename}?expires=${expires}${uidParam}&signature=${signature}`;
}

/**
 * Verifies a signed URL.
 * @param {string} filename
 * @param {string} expires
 * @param {string} signature
 * @param {string|number|null} [userId] - Optional user ID to verify bound ownership.
 * @returns {boolean}
 */
function verifySignedUrl(filename, expires, signature, userId = null) {
    if (!filename || !expires || !signature) return false;

    const now = Math.floor(Date.now() / 1000);
    if (parseInt(expires, 10) < now) return false;

    let secret;
    try {
        secret = getFileSignSecret();
    } catch {
        // Misconfigured secret: never verify successfully.
        return false;
    }

    const provided = Buffer.from(String(signature), 'utf8');
    const uidStr = (userId !== null && userId !== undefined && userId !== '') ? String(userId) : '';

    const candidates = [];
    if (uidStr) {
        candidates.push(`${filename}:${expires}:${uidStr}`);
    } else {
        candidates.push(`${filename}:${expires}`);
    }

    return candidates.some(dataToSign => {
        const expectedSignature = crypto.createHmac('sha256', secret)
            .update(dataToSign)
            .digest('hex');
        const expected = Buffer.from(expectedSignature, 'utf8');
        if (provided.length !== expected.length) return false;
        return crypto.timingSafeEqual(provided, expected);
    });
}

module.exports = { generateSignedUrl, verifySignedUrl };
