const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { verifySignedUrl, generateSignedUrl } = require('../utils/generateSignedUrl');
const { requireAuth } = require('../middleware/auth');

// GET /secure-file/:filename
// Serves file if signature is valid
router.get('/:filename', (req, res) => {
    const { filename } = req.params;
    const { expires, signature } = req.query;

    console.log('🔐 Secure file request:', {
        filename,
        expires,
        signature: signature?.substring(0, 10) + '...',
        fullUrl: req.originalUrl
    });

    if (!verifySignedUrl(filename, expires, signature)) {
        console.error('❌ Signature verification failed');
        return res.status(403).send('Forbidden: Invalid or expired signature');
    }

    const filePath = path.join(__dirname, '../../uploads', filename);

    // Prevent directory traversal
    if (!filePath.startsWith(path.join(__dirname, '../../uploads'))) {
        console.error('❌ Directory traversal attempt');
        return res.status(403).send('Forbidden');
    }

    if (!fs.existsSync(filePath)) {
        console.error('❌ File not found:', filePath);
        return res.status(404).send('File not found');
    }

    console.log('✅ Serving file:', filename);
    res.sendFile(filePath);
});

// POST /api/file/refresh-url
// Generates a new signed URL for a given filename (requires auth)
router.post('/refresh-url', requireAuth, (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ message: 'Filename required' });

    // Optional: Check if file exists or if user has access to it (omitted for now as per requirements)

    const signedUrl = generateSignedUrl(filename);
    res.json({ url: signedUrl });
});

module.exports = router;
