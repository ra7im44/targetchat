const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { Widget, ActivityLog } = require('../models');

// GET /api/widgets - List all widgets
router.get('/', requireAuth, async (req, res) => {
    try {
        const widgets = await Widget.findAll({
            where: { userId: req.user.id },
            order: [['updated_at', 'DESC']]
        });
        res.json({ widgets });
    } catch (error) {
        console.error('List widgets error:', error);
        res.status(500).json({ message: 'Failed to list widgets' });
    }
});

// GET /api/widgets/:id - Get widget details
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const widget = await Widget.findOne({
            where: {
                id,
                userId: req.user.id
            }
        });

        if (!widget) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        res.json({ widget });
    } catch (error) {
        console.error('Get widget error:', error);
        res.status(500).json({ message: 'Failed to get widget' });
    }
});

var usageLimit = (req, res, next) => require('../middleware/usageLimit')(req, res, next);

// POST /api/widgets - Create widget
router.post('/', requireAuth, (req, res, next) => { req.usageResourceType = 'widgets'; next(); }, usageLimit, async (req, res) => {
    try {
        const { name, workspace_id, workflowId } = req.body;

        const widget = await Widget.create({
            userId: req.user.id,
            workspaceId: workspace_id,
            name: name || 'My New Widget',
            workflowId: workflowId || null,
            // slug, keys, theme, triggers are handled by model defaults/hooks
        });

        // Log activity
        await ActivityLog.create({
            userId: req.user.id,
            action: 'create_widget',
            entityType: 'widget',
            entityId: widget.id.toString(),
            metadata: { name: widget.name }
        });

        res.status(201).json({ widget });
    } catch (error) {
        console.error('Create widget error:', error);
        res.status(500).json({ message: 'Failed to create widget' });
    }
});

// PUT /api/widgets/:id - Update widget
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, theme, triggers, settings, status, workflowId } = req.body;

        const widget = await Widget.findOne({
            where: {
                id,
                userId: req.user.id
            }
        });

        if (!widget) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        if (name) widget.name = name;
        if (theme) widget.theme = { ...widget.theme, ...theme };
        if (triggers) widget.triggers = { ...widget.triggers, ...triggers };
        if (settings) widget.settings = { ...widget.settings, ...settings };
        if (status) widget.status = status;
        if (workflowId !== undefined) widget.workflowId = workflowId;

        await widget.save();

        res.json({ widget });
    } catch (error) {
        console.error('Update widget error:', error);
        res.status(500).json({ message: 'Failed to update widget' });
    }
});

// DELETE /api/widgets/:id - Delete widget
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Widget.destroy({
            where: {
                id,
                userId: req.user.id
            }
        });

        if (!result) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        // Log activity
        await ActivityLog.create({
            userId: req.user.id,
            action: 'delete_widget',
            entityType: 'widget',
            entityId: id.toString()
        });

        res.json({ message: 'Widget deleted' });
    } catch (error) {
        console.error('Delete widget error:', error);
        res.status(500).json({ message: 'Failed to delete widget' });
    }
});

// PATCH /api/widgets/:id/workflow-status - Toggle workflow ON/OFF
router.patch('/:id/workflow-status', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const widget = await Widget.findOne({
            where: { id, userId: req.user.id }
        });

        if (!widget) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        await widget.update({
            workflowStatus: status,
            lastWorkflowToggle: new Date(),
            workflowToggleCount: widget.workflowToggleCount + 1
        });

        // Emit Socket.io event
        const io = req.app.get('io');
        if (io) {
            io.emit('workflow:toggled', {
                widgetId: id,
                status,
                timestamp: new Date()
            });
        }

        res.json({ widget, message: `Workflow ${status ? 'enabled' : 'disabled'}` });
    } catch (error) {
        console.error('Toggle workflow error:', error);
        res.status(500).json({ message: 'Failed to toggle workflow' });
    }
});

// GET /api/widgets/:id/assignees - Get assigned humans
router.get('/:id/assignees', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { WidgetAssignee, User } = require('../models');

        const widget = await Widget.findOne({
            where: { id, userId: req.user.id }
        });

        if (!widget) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        const assignees = await WidgetAssignee.findAll({
            where: { widgetId: id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        res.json({ assignees });
    } catch (error) {
        console.error('Get assignees error:', error);
        res.status(500).json({ message: 'Failed to get assignees' });
    }
});

// POST /api/widgets/:id/assignees - Assign human to widget
router.post('/:id/assignees', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, is_primary } = req.body;
        const { WidgetAssignee } = require('../models');

        const widget = await Widget.findOne({
            where: { id, userId: req.user.id }
        });

        if (!widget) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        const [assignee, created] = await WidgetAssignee.findOrCreate({
            where: { widgetId: id, userId: user_id },
            defaults: { isPrimary: is_primary || false }
        });

        if (!created) {
            await assignee.update({ isPrimary: is_primary || false });
        }

        res.status(created ? 201 : 200).json({ assignee, created });
    } catch (error) {
        console.error('Assign user error:', error);
        res.status(500).json({ message: 'Failed to assign user' });
    }
});

// DELETE /api/widgets/:id/assignees/:userId - Remove assignee
router.delete('/:id/assignees/:userId', requireAuth, async (req, res) => {
    try {
        const { id, userId } = req.params;
        const { WidgetAssignee } = require('../models');

        const widget = await Widget.findOne({
            where: { id, userId: req.user.id }
        });

        if (!widget) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        await WidgetAssignee.destroy({
            where: { widgetId: id, userId }
        });

        res.json({ message: 'Assignee removed successfully' });
    } catch (error) {
        console.error('Remove assignee error:', error);
        res.status(500).json({ message: 'Failed to remove assignee' });
    }
});

module.exports = router;
