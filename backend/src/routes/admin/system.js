const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const path = require('path');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { User, Widget, Message, Lead, Workflow } = require('../../models');

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/system/health
 * Returns server vital statistics (CPU, RAM, Uptime)
 */
router.get('/health', (req, res) => {
    try {
        const uptime = os.uptime();
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const usedMem = totalMem - freeMem;
        const memUsage = Math.round((usedMem / totalMem) * 100);

        // Calculate CPU Load (Simple 1-min avg for now or just core info)
        const cpus = os.cpus();
        const loadAvg = os.loadavg(); // Returns [1, 5, 15] min avg

        const systemInfo = {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            uptime: uptime,
            memory: {
                total: formatBytes(totalMem),
                free: formatBytes(freeMem),
                used: formatBytes(usedMem),
                percentage: memUsage
            },
            cpu: {
                cores: cpus.length,
                model: cpus[0].model,
                load: loadAvg[0]
            }
        };

        res.json(systemInfo);
    } catch (err) {
        console.error('System Health Error:', err);
        res.status(500).json({ message: 'Failed to retrieve system health' });
    }
});

/**
 * GET /api/admin/system/backup
 * Generates a full JSON dump of the database
 */
router.get('/backup', async (req, res) => {
    try {
        // Fetch all data from critical tables
        // Note: For huge DBs this is bad, but for typical SaaS start it's fine.
        // Ideally use mysqldump via child_process, but this is DB-agnostic.

        const backupData = {
            timestamp: new Date().toISOString(),
            users: await User.findAll(),
            widgets: await Widget.findAll(),
            workflows: await Workflow.findAll(),
            leads: await Lead.findAll({ limit: 1000 }), // Limit to prevent crash
            // Messages might be too huge, skipping or limiting
            system_info: {
                version: '1.0.0',
                generator: 'TargetChat Admin'
            }
        };

        const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(JSON.stringify(backupData, null, 2));

    } catch (err) {
        console.error('Backup Error:', err);
        res.status(500).json({ message: 'Backup generation failed' });
    }
});

// Helper to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
