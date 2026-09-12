const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { verifySignedUrl, generateSignedUrl } = require('../utils/generateSignedUrl');
const { requireAuth } = require('../middleware/auth');
const { Message, Chat, Widget, Channel } = require('../models');
const { Op } = require('sequelize');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

/**
 * Resolves `filename` inside the uploads directory.
 * Returns null on any traversal/absolute-path attempt.
 */
function resolveUploadPath(filename) {
    if (typeof filename !== 'string' || filename.length === 0) return null;
    // Reject absolute paths, traversal segments, and separators outright.
    if (path.isAbsolute(filename)) return null;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return null;
    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (resolved !== UPLOADS_DIR && !resolved.startsWith(UPLOADS_DIR + path.sep)) return null;
    return resolved;
}

// GET /secure-file/:filename
// Serves file if signature is valid
router.get('/:filename', (req, res) => {
    const { filename } = req.params;
    const { expires, signature, uid } = req.query;

    if (!expires || !signature) {
        return res.status(403).send('Forbidden: Missing signature or expiry');
    }

    if (!verifySignedUrl(filename, expires, signature, uid)) {
        return res.status(403).send('Forbidden: Invalid or expired signature');
    }

    const filePath = resolveUploadPath(filename);
    if (!filePath) {
        console.error('❌ Directory traversal attempt');
        return res.status(403).send('Forbidden');
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }

    res.sendFile(filePath);
});

// POST /api/file/refresh-url
// Generates a new signed URL for a given filename (requires auth).
// SECURITY: IDOR guard — the file must physically exist and be referenced by a message inside a
// chat the requester owns, is assigned to, or whose widget/channel they own.
// Exact canonical comparison is strictly enforced; wildcard LIKE matching is prohibited.
router.post('/refresh-url', requireAuth, async (req, res) => {
    const { filename } = req.body;
    if (!filename || typeof filename !== 'string') return res.status(400).json({ message: 'Filename required' });

    // Validate clean basename (no separators, traversal, or query params)
    const cleanFilename = path.basename(filename.trim()).split('?')[0];
    if (!cleanFilename || cleanFilename !== filename.trim()) {
        return res.status(400).json({ message: 'Invalid filename' });
    }

    const filePath = resolveUploadPath(cleanFilename);
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    let allowed = false;

    // Admins have access to refresh verified files across the system
    if (userRole === 'admin' || userRole === 'superadmin') {
        allowed = true;
    } else {
        // Match exact canonical filename references only for authentic media attachments (never plain text)
        const exactMatches = [
            cleanFilename,
            `/uploads/${cleanFilename}`,
            `/secure-file/${cleanFilename}`
        ];

        const referencingMessages = await Message.findAll({
            where: {
                type: { [Op.in]: ['image', 'audio', 'video', 'file'] },
                text: { [Op.in]: exactMatches }
            },
            include: [{
                model: Chat,
                as: 'chat',
                include: [
                    { model: Widget, as: 'widget', attributes: ['id', 'userId'] },
                    { model: Channel, as: 'channel', attributes: ['id', 'userId'] }
                ]
            }]
        });

        for (const msg of referencingMessages) {
            const chat = msg.chat;
            if (!chat) continue;
            if (chat.userId === userId || chat.assignedTo === userId) {
                allowed = true;
                break;
            }
            if (chat.widget && chat.widget.userId === userId) {
                allowed = true;
                break;
            }
            if (chat.channel && chat.channel.userId === userId) {
                allowed = true;
                break;
            }
        }
    }

    if (!allowed) {
        return res.status(404).json({ message: 'File not found' });
    }

    const signedUrl = generateSignedUrl(cleanFilename, userId);
    res.json({ url: signedUrl });
});

module.exports = router;
