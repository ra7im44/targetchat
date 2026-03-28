const express = require('express');
const router = express.Router();
const { Workflow, Chat, Message } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');

// All routes require admin
router.use(requireAuth, requireAdmin);

// GET /api/admin/workflows - List all workflows (including inactive)
router.get('/', async (req, res) => {
    try {
        const { User } = require('../../models');

        const workflows = await Workflow.findAll({
            include: [{
                model: User,
                as: 'owner',
                attributes: ['id', 'name', 'email'],
                required: false
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json(workflows);
    } catch (err) {
        console.error('Error fetching workflows:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/workflows - Create new workflow
router.post('/', async (req, res) => {
    try {
        const { name, description, webhookUrl, icon, isPublic } = req.body;

        if (!name || !webhookUrl) {
            return res.status(400).json({ message: 'Name and webhook URL are required' });
        }

        const workflow = await Workflow.create({
            name,
            description,
            webhookUrl,
            icon: icon || '🤖',
            isActive: true,
            isPublic: isPublic !== undefined ? isPublic : true
        });

        res.status(201).json(workflow);
    } catch (err) {
        console.error('Error creating workflow:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/admin/workflows/:id - Update workflow
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, webhookUrl, icon, isActive, isPublic } = req.body;

        const workflow = await Workflow.findByPk(id);
        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        await workflow.update({
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(webhookUrl !== undefined && { webhookUrl }),
            ...(icon !== undefined && { icon }),
            ...(isActive !== undefined && { isActive }),
            ...(isPublic !== undefined && { isPublic })
        });

        res.json(workflow);
    } catch (err) {
        console.error('Error updating workflow:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/workflows/:id - Delete workflow
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const workflow = await Workflow.findByPk(id);
        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        // Check if any chats are using this workflow
        const chatCount = await Chat.count({ where: { workflowId: id } });
        if (chatCount > 0) {
            return res.status(400).json({
                message: `Cannot delete workflow. ${chatCount} chat(s) are using it.`
            });
        }

        await workflow.destroy();
        res.json({ message: 'Workflow deleted successfully' });
    } catch (err) {
        console.error('Error deleting workflow:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/workflows/:id/stats - Get workflow statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        const workflow = await Workflow.findByPk(id);
        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        const chatCount = await Chat.count({ where: { workflowId: id } });
        const messageCount = await Message.count({
            include: [{
                model: Chat,
                where: { workflowId: id },
                attributes: []
            }]
        });

        res.json({
            workflowId: id,
            workflowName: workflow.name,
            totalChats: chatCount,
            totalMessages: messageCount,
            isActive: workflow.isActive
        });
    } catch (err) {
        console.error('Error fetching workflow stats:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/workflows/:id/assign-users - Assign users to workflow
router.post('/:id/assign-users', async (req, res) => {
    try {
        const { id } = req.params;
        const { userIds } = req.body;
        const adminId = req.user.id;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'userIds array is required' });
        }

        const workflow = await Workflow.findByPk(id);
        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        const { User, WorkflowUser } = require('../../models');

        // Add users to workflow
        const assignments = await Promise.all(
            userIds.map(async (userId) => {
                const [assignment, created] = await WorkflowUser.findOrCreate({
                    where: { workflowId: id, userId },
                    defaults: { assignedBy: adminId }
                });
                return { userId, created };
            })
        );

        res.json({
            message: 'Users assigned successfully',
            assignments
        });
    } catch (err) {
        console.error('Error assigning users:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/workflows/:id/unassign-user/:userId - Remove user from workflow
router.delete('/:id/unassign-user/:userId', async (req, res) => {
    try {
        const { id, userId } = req.params;

        const { WorkflowUser } = require('../../models');

        const deleted = await WorkflowUser.destroy({
            where: { workflowId: id, userId }
        });

        if (deleted === 0) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        res.json({ message: 'User unassigned successfully' });
    } catch (err) {
        console.error('Error unassigning user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/workflows/:id/assigned-users - Get users assigned to workflow
router.get('/:id/assigned-users', async (req, res) => {
    try {
        const { id } = req.params;

        const workflow = await Workflow.findByPk(id);
        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        const { User } = require('../../models');

        const users = await workflow.getAssignedUsers({
            attributes: ['id', 'name', 'email'],
            through: { attributes: ['assignedAt', 'assignedBy'] }
        });

        res.json(users);
    } catch (err) {
        console.error('Error fetching assigned users:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
