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
    const { expires, signature } = req.query;

    if (!expires || !signature) {
        return res.status(403).send('Forbidden: Missing signature or expiry');
    }

    if (!verifySignedUrl(filename, expires, signature)) {
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
// SECURITY: IDOR guard — the file must be referenced by a message inside a
// chat the requester owns, is assigned to, or whose widget/channel they own.
router.post('/refresh-url', requireAuth, async (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ message: 'Filename required' });

    if (!resolveUploadPath(filename)) {
        return res.status(400).json({ message: 'Invalid filename' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    let allowed = false;

    // Admins have access to refresh files across the system
    if (userRole === 'admin' || userRole === 'superadmin') {
        allowed = true;
    } else {
        const referencingMessage = await Message.findOne({
            where: {
                [Op.or]: [
                    { text: filename },
                    { text: { [Op.like]: `%${filename}%` } }
                ]
            },
            include: [{ model: Chat, as: 'chat' }]
        });

        if (referencingMessage && referencingMessage.chat) {
            const chat = referencingMessage.chat;
            if (chat.userId === userId || chat.assignedTo === userId) {
                allowed = true;
            } else if (chat.widgetId) {
                const widget = await Widget.findByPk(chat.widgetId, { attributes: ['userId'] });
                if (widget && widget.userId === userId) allowed = true;
            } else if (chat.channelId) {
                const channel = await Channel.findByPk(chat.channelId, { attributes: ['userId'] });
                if (channel && channel.userId === userId) allowed = true;
            }
        }
    }

    if (!allowed) {
        return res.status(404).json({ message: 'File not found' });
    }

    const signedUrl = generateSignedUrl(filename);
    res.json({ url: signedUrl });
});

module.exports = router;
