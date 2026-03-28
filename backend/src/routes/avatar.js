const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { requireAuth } = require('../middleware/auth');
const { User } = require('../models');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    }
});

// Ensure avatars directory exists
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
fs.mkdir(avatarsDir, { recursive: true }).catch(console.error);

// POST /api/user/avatar - Upload avatar
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.user.id;
        const filename = `avatar-${userId}-${Date.now()}.webp`;
        const filepath = path.join(avatarsDir, filename);

        // Process image with sharp (resize and convert to webp)
        await sharp(req.file.buffer)
            .resize(200, 200, {
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality: 90 })
            .toFile(filepath);

        // Delete old avatar if exists
        const user = await User.findByPk(userId);
        if (user.avatar) {
            const oldPath = path.join(avatarsDir, path.basename(user.avatar));
            try {
                await fs.unlink(oldPath);
            } catch (err) {
                // Ignore if file doesn't exist
            }
        }

        // Update user avatar in database
        await user.update({ avatar: filename });

        res.json({
            success: true,
            avatar: filename,
            url: `/api/user/avatar/${filename}`
        });

    } catch (err) {
        console.error('Avatar upload error:', err);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// GET /api/user/avatar/:filename - Serve avatar
router.get('/avatar/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(avatarsDir, filename);

        // Check if file exists
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({ error: 'Avatar not found' });
        }

        res.sendFile(filepath);

    } catch (err) {
        console.error('Avatar serve error:', err);
        res.status(500).json({ error: 'Failed to serve avatar' });
    }
});

// DELETE /api/user/avatar - Delete avatar
router.delete('/avatar', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);

        if (user.avatar) {
            const filepath = path.join(avatarsDir, user.avatar);
            try {
                await fs.unlink(filepath);
            } catch (err) {
                // Ignore if file doesn't exist
            }

            await user.update({ avatar: null });
        }

        res.json({ success: true });

    } catch (err) {
        console.error('Avatar delete error:', err);
        res.status(500).json({ error: 'Failed to delete avatar' });
    }
});

module.exports = router;
