const express = require('express');
const router = express.Router();
const { Workflow, User } = require('../models');
const { requireAuth } = require('../middleware/auth');

// GET /api/workflows - List workflows accessible to user
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const workspaceId = req.query.workspace_id;

        let whereClause = { isActive: true };

        if (workspaceId) {
            // If workspace_id provided, return workflows belonging to that workspace
            // TODO: Add permission check to verify user has access to this workspace
            const { WorkspaceMember } = require('../models');
            const membership = await WorkspaceMember.findOne({
                where: { workspace_id: workspaceId, user_id: userId }
            });

            if (!membership) {
                return res.status(403).json({ message: 'Access denied to this workspace' });
            }

            whereClause.workspaceId = workspaceId;
        } else {
            // If no workspace_id: Return personal workflows + assigned + public system templates
            whereClause[require('sequelize').Op.or] = [
                { userId: userId, workspaceId: null }, // Personal workflows
                { '$assignedUsers.id$': userId, workspaceId: null }, // Assigned to user
                { isPublic: true, userId: null, workspaceId: null } // System templates
            ];
        }

        const workflows = await Workflow.findAll({
            where: whereClause,
            include: workspaceId ? [] : [{
                model: User,
                as: 'assignedUsers',
                required: false,
                attributes: [],
                through: { attributes: [] }
            }],
            order: [['createdAt', 'ASC']]
        });

        res.json(workflows);
    } catch (err) {
        console.error('Error fetching workflows:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/workflows - Create a new workflow
router.post('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, webhookUrl, icon, workspaceId } = req.body;

        if (!name || !webhookUrl) {
            return res.status(400).json({ message: 'Name and Webhook URL are required' });
        }

        // If workspaceId provided, check permissions
        if (workspaceId) {
            const { WorkspaceMember } = require('../models');
            const membership = await WorkspaceMember.findOne({
                where: { workspace_id: workspaceId, user_id: userId }
            });

            if (!membership) {
                return res.status(403).json({ message: 'Access denied to this workspace' });
            }

            // Check if user has permission to create workflows
            const permissions = membership.permissions || {};
            if (!permissions.canCreateWorkflows && membership.role !== 'owner') {
                return res.status(403).json({ message: 'You do not have permission to create workflows in this workspace' });
            }
        }

        const workflow = await Workflow.create({
            name,
            description,
            webhookUrl,
            icon: icon || '⚡',
            userId,
            workspaceId: workspaceId || null,
            isPublic: false, // User workflows are private by default
            isActive: true
        });

        res.status(201).json(workflow);
    } catch (err) {
        console.error('Error creating workflow:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/workflows/my - Get only user's own workflows (for dashboard)
router.get('/my', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const workflows = await Workflow.findAll({
            where: {
                userId: userId,
                isActive: true
            },
            order: [['createdAt', 'DESC']]
        });

        res.json(workflows);
    } catch (err) {
        console.error('Error fetching user workflows:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/workflows/:id - Update user's workflow
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const workflowId = req.params.id;
        const { name, description, webhookUrl, icon, isActive } = req.body;

        // Find workflow
        const workflow = await Workflow.findByPk(workflowId);

        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== userId) {
            return res.status(403).json({ message: 'You can only edit your own workflows' });
        }

        // Update workflow
        await workflow.update({
            name: name || workflow.name,
            description: description !== undefined ? description : workflow.description,
            webhookUrl: webhookUrl || workflow.webhookUrl,
            icon: icon || workflow.icon,
            isActive: isActive !== undefined ? isActive : workflow.isActive
        });

        res.json(workflow);
    } catch (err) {
        console.error('Error updating workflow:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/workflows/:id - Delete user's workflow
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const workflowId = req.params.id;

        // Find workflow
        const workflow = await Workflow.findByPk(workflowId);

        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        // Check ownership
        if (workflow.userId !== userId) {
            return res.status(403).json({ message: 'You can only delete your own workflows' });
        }

        // Soft delete (set isActive to false)
        await workflow.update({ isActive: false });

        res.json({ message: 'Workflow deleted successfully' });
    } catch (err) {
        console.error('Error deleting workflow:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
