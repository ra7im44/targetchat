const crypto = require('crypto');
const { getFileSignSecret } = require('../config/secrets');

const EXPIRE_SECONDS = parseInt(process.env.FILE_URL_EXPIRE_SECONDS || '86400', 10); // 24 hours default

/**
 * Generates a signed URL for a given filename.
 * @param {string} filename - The name of the file in the uploads directory.
 * @returns {string} - The relative URL with signature and expiry.
 */
function generateSignedUrl(filename) {
    const secret = getFileSignSecret();
    const expires = Math.floor(Date.now() / 1000) + EXPIRE_SECONDS;
    const dataToSign = `${filename}:${expires}`;
    const signature = crypto.createHmac('sha256', secret)
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

    let secret;
    try {
        secret = getFileSignSecret();
    } catch {
        // Misconfigured secret: never verify successfully.
        return false;
    }

    const dataToSign = `${filename}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', secret)
        .update(dataToSign)
        .digest('hex');

    // timingSafeEqual throws when buffer lengths differ, so guard first and
    // compare in constant time only for equal-length hex digests.
    const provided = Buffer.from(String(signature), 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    if (provided.length !== expected.length) return false;

    return crypto.timingSafeEqual(provided, expected);
}

module.exports = { generateSignedUrl, verifySignedUrl };
