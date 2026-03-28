const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Allowed file types: Documents, Images, Audio, Video
        const allowedMimeTypes = [
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/rtf',
            'application/vnd.oasis.opendocument.text',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/csv',
            // Images
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            // Audio
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/mp4',
            'audio/webm',
            // Video
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/avi',
            'video/quicktime'
        ];

        const allowedExtensions = [
            // Documents
            '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx', '.csv',
            // Images
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
            // Audio
            '.mp3', '.wav', '.ogg', '.m4a',
            // Video
            '.mp4', '.webm', '.avi', '.mov'
        ];

        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only documents, images, audio, and video files are allowed'));
        }
    }
});

const { generateSignedUrl } = require('../utils/generateSignedUrl');

router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the signed URL to the file
    const signedUrl = generateSignedUrl(req.file.filename);

    return res.json({
        url: signedUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
});

module.exports = router;
