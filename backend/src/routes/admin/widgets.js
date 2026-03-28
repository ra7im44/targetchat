const express = require('express');
const router = express.Router();
const { Widget, User } = require('../../models');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/widgets
 * List all widgets with user info
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const widgets = await Widget.findAndCountAll({
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [{ model: User, attributes: ['name', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(widgets);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error loading widgets' });
    }
});

/**
 * PATCH /api/admin/widgets/:id/status
 * Toggle Widget Status (Kill Switch)
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active' or 'inactive'

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const widget = await Widget.findByPk(id);
        if (!widget) return res.status(404).json({ message: 'Widget not found' });

        await widget.update({ status });

        console.log(`[Admin] Widget ${id} status changed to ${status}`);

        res.json(widget);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating widget status' });
    }
});

/**
 * PATCH /api/admin/widgets/:id/force-branding
 * Force branding on a widget
 */
router.patch('/:id/force-branding', async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.body;

        const widget = await Widget.findByPk(id);
        if (!widget) return res.status(404).json({ message: 'Widget not found' });

        // Update settings to enforce branding
        const newSettings = { ...widget.settings, showBranding: force };
        await widget.update({ settings: newSettings });

        res.json(widget);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error forcing branding' });
    }
});

module.exports = router;
