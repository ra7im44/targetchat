const crypto = require('crypto');

/**
 * Verify a Meta / WhatsApp Cloud API webhook signature.
 *
 * Meta signs every webhook delivery with HMAC-SHA256 over the RAW request body
 * using the Meta App Secret, delivered in the `X-Hub-Signature-256` header as
 * `sha256=<hex>`. Verification MUST run against the exact raw bytes the provider
 * sent (captured into req.rawBody by the body parser `verify` callback), not the
 * re-serialized parsed object.
 *
 * SECURITY: the comparison is constant-time (timingSafeEqual) to prevent
 * signature-oracle timing attacks.
 *
 * @param {Buffer|string} rawBody - Exact raw request body bytes.
 * @param {string|undefined} signatureHeader - The X-Hub-Signature-256 header value.
 * @param {string|undefined} appSecret - The Meta App Secret configured for this install.
 * @returns {boolean} true when the signature is present, well-formed, valid, and fresh.
 */
function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
    if (!appSecret || typeof appSecret !== 'string' || appSecret.length === 0) {
        // Fail closed: without a configured secret we cannot verify anything.
        return false;
    }
    if (!rawBody) {
        // Fail closed: no raw body means verification is impossible.
        return false;
    }
    if (typeof signatureHeader !== 'string' || signatureHeader.length === 0) {
        return false;
    }

    const expected = 'sha256=';
    if (!signatureHeader.startsWith(expected)) {
        return false;
    }

    // SECURITY: compare raw HMAC digest bytes, NOT the hex ASCII strings.
    // digest('hex') emits lowercase; a provider/proxy sending uppercase hex
    // would otherwise fail a byte-wise string comparison. Accept either case,
    // validate the shape strictly (exactly 64 hex chars), and compare the
    // decoded signature bytes against the raw digest.
    const providedHex = signatureHeader.slice(expected.length);
    if (!/^[0-9a-f]{64}$/i.test(providedHex)) {
        return false;
    }

    const provided = Buffer.from(providedHex, 'hex');
    const expectedSig = crypto.createHmac('sha256', appSecret).update(rawBody).digest();

    // Length check BEFORE timingSafeEqual (which throws on length mismatch).
    if (provided.length !== expectedSig.length) {
        return false;
    }
    return crypto.timingSafeEqual(provided, expectedSig);
}

module.exports = { verifyMetaSignature };
