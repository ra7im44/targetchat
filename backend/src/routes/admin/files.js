const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { generateSignedUrl } = require('../../utils/generateSignedUrl');
const { Setting } = require('../../models');

router.use(requireAuth, requireAdmin);

const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getFileCategory(ext) {
    const clean = (ext || '').toLowerCase().replace('.', '');
    const categories = {
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico'],
        video: ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv'],
        audio: ['mp3', 'wav', 'ogg', 'm4a', 'webm', 'aac'],
        document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz']
    };
    for (const [cat, exts] of Object.entries(categories)) {
        if (exts.includes(clean)) return cat;
    }
    return 'other';
}

function scanRecursive(dirPath, statsCollector) {
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                statsCollector.totalFolders += 1;
                scanRecursive(full, statsCollector);
            } else {
                try {
                    const st = fs.statSync(full);
                    const ext = path.extname(entry.name);
                    const cat = getFileCategory(ext);
                    statsCollector.totalFiles += 1;
                    statsCollector.totalSize += st.size;
                    if (statsCollector.byCategory[cat]) {
                        statsCollector.byCategory[cat].count += 1;
                        statsCollector.byCategory[cat].size += st.size;
                    } else {
                        statsCollector.byCategory.other.count += 1;
                        statsCollector.byCategory.other.size += st.size;
                    }
                } catch {}
            }
        }
    } catch {}
}

function getFolderStats(dirPath) {
    let size = 0;
    let count = 0;
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                const sub = getFolderStats(full);
                size += sub.size;
                count += sub.count;
            } else {
                try {
                    const s = fs.statSync(full);
                    size += s.size;
                    count += 1;
                } catch {}
            }
        }
    } catch {}
    return { size, count };
}

// Multer storage for admin uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let targetDir = UPLOADS_DIR;
        const requestedFolder = req.query.folder || (req.body && req.body.folder) || '';
        if (requestedFolder) {
            const safe = path.normalize(requestedFolder).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
            const resolved = path.resolve(UPLOADS_DIR, safe);
            if (resolved.startsWith(UPLOADS_DIR) && fs.existsSync(resolved)) {
                targetDir = resolved;
            }
        }
        cb(null, targetDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// GET /api/admin/files - List files and directories with stats and breadcrumbs
router.get('/', (req, res) => {
    try {
        const requestedFolder = (req.query.folder || '').trim();
        const safeFolder = path.normalize(requestedFolder).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
        const targetDir = path.resolve(UPLOADS_DIR, safeFolder);

        // Security: directory traversal prevention
        if (!targetDir.startsWith(UPLOADS_DIR)) {
            return res.status(403).json({ message: 'Access denied: Path out of bounds' });
        }

        if (!fs.existsSync(targetDir)) {
            return res.status(404).json({ message: 'Directory not found' });
        }

        // Global stats collector
        const globalStats = {
            totalFiles: 0,
            totalFolders: 0,
            totalSize: 0,
            byCategory: {
                image: { count: 0, size: 0 },
                video: { count: 0, size: 0 },
                audio: { count: 0, size: 0 },
                document: { count: 0, size: 0 },
                archive: { count: 0, size: 0 },
                other: { count: 0, size: 0 }
            }
        };
        scanRecursive(UPLOADS_DIR, globalStats);

        // Read current directory items
        const rawEntries = fs.readdirSync(targetDir, { withFileTypes: true });
        const items = rawEntries.map(entry => {
            const fullPath = path.join(targetDir, entry.name);
            const relPath = path.relative(UPLOADS_DIR, fullPath).replace(/\\/g, '/');
            const isDir = entry.isDirectory();

            if (isDir) {
                const subStats = getFolderStats(fullPath);
                let directChildCount = 0;
                try {
                    directChildCount = fs.readdirSync(fullPath).length;
                } catch {}

                let birthtime = new Date();
                try { birthtime = fs.statSync(fullPath).birthtime; } catch {}

                return {
                    name: entry.name,
                    path: relPath,
                    isDirectory: true,
                    category: 'folder',
                    size: subStats.size,
                    itemCount: directChildCount,
                    totalNestedFiles: subStats.count,
                    createdAt: birthtime
                };
            } else {
                let st = { size: 0, birthtime: new Date(), mtime: new Date() };
                try { st = fs.statSync(fullPath); } catch {}
                const ext = path.extname(entry.name);
                const category = getFileCategory(ext);

                return {
                    name: entry.name,
                    path: relPath,
                    isDirectory: false,
                    category,
                    size: st.size,
                    createdAt: st.birthtime,
                    modifiedAt: st.mtime,
                    extension: ext.toLowerCase().replace('.', ''),
                    url: generateSignedUrl(relPath, req.user?.id)
                };
            }
        });

        // Folders first, then files sorted by newest
        items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Breadcrumbs calculation
        const breadcrumbs = [{ name: 'Root', path: '' }];
        if (safeFolder) {
            const segments = safeFolder.split(/[\/\\]+/).filter(Boolean);
            let accumulated = '';
            for (const seg of segments) {
                accumulated = accumulated ? `${accumulated}/${seg}` : seg;
                breadcrumbs.push({ name: seg, path: accumulated });
            }
        }

        res.json({
            items,
            currentFolder: safeFolder,
            breadcrumbs,
            stats: globalStats
        });
    } catch (err) {
        console.error('File manager list error:', err);
        res.status(500).json({ message: 'Server error listing files', error: err.message });
    }
});

// POST /api/admin/files/upload - Direct upload to current folder
router.post('/upload', upload.array('files', 15), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const uploadedList = [];
        for (const f of req.files) {
            const relPath = path.relative(UPLOADS_DIR, f.path).replace(/\\/g, '/');
            const ext = path.extname(f.filename);
            const category = getFileCategory(ext);

            // Create immutable ownership record
            try {
                await Setting.findOrCreate({
                    where: { key: `upload_ownership_${f.filename}` },
                    defaults: {
                        section: 'security',
                        key: `upload_ownership_${f.filename}`,
                        value: JSON.stringify({
                            userId: req.user?.id || 1,
                            userEmail: req.user?.email || 'admin@targetchat.com',
                            originalName: f.originalname,
                            mimeType: f.mimetype,
                            size: f.size,
                            uploadedAt: new Date().toISOString()
                        }),
                        type: 'json',
                        description: `Upload ownership for ${f.filename}`,
                        isPublic: false
                    }
                });
            } catch (err) {
                console.error('Ownership record error:', err);
            }

            uploadedList.push({
                name: f.filename,
                originalName: f.originalname,
                path: relPath,
                size: f.size,
                category,
                url: generateSignedUrl(relPath, req.user?.id)
            });
        }

        res.status(201).json({
            message: `${uploadedList.length} file(s) uploaded successfully`,
            files: uploadedList
        });
    } catch (err) {
        console.error('Admin file upload error:', err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
});

// POST /api/admin/files/folder - Create a new directory
router.post('/folder', (req, res) => {
    try {
        const { name, parentFolder = '' } = req.body;

        if (!name || typeof name !== 'string') {
            return res.status(400).json({ message: 'Folder name is required' });
        }

        const safeName = name.trim().replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
        if (!safeName) {
            return res.status(400).json({ message: 'Invalid folder name' });
        }

        const safeParent = path.normalize(parentFolder || '').replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
        const targetParent = path.resolve(UPLOADS_DIR, safeParent);

        if (!targetParent.startsWith(UPLOADS_DIR)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const newFolderPath = path.join(targetParent, safeName);

        if (fs.existsSync(newFolderPath)) {
            return res.status(409).json({ message: 'A folder with this name already exists' });
        }

        fs.mkdirSync(newFolderPath, { recursive: true });

        const relPath = path.relative(UPLOADS_DIR, newFolderPath).replace(/\\/g, '/');
        res.status(201).json({
            message: 'Folder created successfully',
            folder: {
                name: safeName,
                path: relPath,
                isDirectory: true
            }
        });
    } catch (err) {
        console.error('Create folder error:', err);
        res.status(500).json({ message: 'Failed to create folder', error: err.message });
    }
});

// DELETE /api/admin/files - Delete file or folder
router.delete('/', async (req, res) => {
    try {
        const targetPathRel = req.query.path || (req.body && req.body.path) || '';

        if (!targetPathRel) {
            return res.status(400).json({ message: 'Path is required' });
        }

        const safePath = path.normalize(targetPathRel).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
        const target = path.resolve(UPLOADS_DIR, safePath);

        // Security checks: must be inside UPLOADS_DIR and cannot be UPLOADS_DIR itself
        if (!target.startsWith(UPLOADS_DIR) || target === UPLOADS_DIR) {
            return res.status(403).json({ message: 'Cannot delete root uploads directory or outside path' });
        }

        if (!fs.existsSync(target)) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const stat = fs.statSync(target);
        if (stat.isDirectory()) {
            fs.rmSync(target, { recursive: true, force: true });
        } else {
            fs.unlinkSync(target);
            const filename = path.basename(target);
            try {
                await Setting.destroy({ where: { key: `upload_ownership_${filename}` } });
            } catch {}
        }

        res.json({ message: 'Item deleted successfully', path: targetPathRel });
    } catch (err) {
        console.error('Delete item error:', err);
        res.status(500).json({ message: 'Failed to delete item', error: err.message });
    }
});

// Legacy single param route support
router.delete('/:filename', async (req, res) => {
    req.query.path = req.params.filename;
    return router.handle(req, res);
});

module.exports = router;
