const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { generateSignedUrl } = require('../../utils/generateSignedUrl');

router.use(requireAuth, requireAdmin);

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// GET /api/admin/files - List files
router.get('/', (req, res) => {
    try {
        fs.readdir(UPLOADS_DIR, (err, files) => {
            if (err) {
                console.error('Error reading uploads dir:', err);
                return res.status(500).json({ message: 'Error reading directory' });
            }

            const fileList = files.map(file => {
                const filePath = path.join(UPLOADS_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    url: generateSignedUrl(file),
                    type: path.extname(file).substring(1)
                };
            });

            // Sort by newest
            fileList.sort((a, b) => b.createdAt - a.createdAt);

            res.json(fileList);
        });
    } catch (err) {
        console.error('File list error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/files/:filename - Delete file
router.delete('/:filename', (req, res) => {
    try {
        const { filename } = req.params;

        // Prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ message: 'Invalid filename' });
        }

        const filePath = path.join(UPLOADS_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                return res.status(500).json({ message: 'Error deleting file' });
            }
            res.json({ message: 'File deleted successfully' });
        });
    } catch (err) {
        console.error('File delete error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
