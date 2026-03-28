const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { User, Workspace, WorkspaceMember, WorkspaceInvitation, SubscriptionPlan, Coupon } = require('../models');
const crypto = require('crypto');
const emailService = require('../services/emailService');

// Helper: Get default permissions by role
function getDefaultPermissions(role) {
    const permissions = {
        owner: {
            canCreateWorkflows: true,
            canEditWorkflows: true,
            canDeleteWorkflows: true,
            canViewAllChats: true,
            canCreateChats: true,
            canInviteMembers: true,
            canManageMembers: true,
            canManageBilling: true
        },
        manager: {
            canCreateWorkflows: true,
            canEditWorkflows: true,
            canDeleteWorkflows: true,
            canViewAllChats: true,
            canCreateChats: true,
            canInviteMembers: true,
            canManageMembers: true,
            canManageBilling: false
        },
        member: {
            canCreateWorkflows: false,
            canEditWorkflows: false,
            canDeleteWorkflows: false,
            canViewAllChats: true,
            canCreateChats: true,
            canInviteMembers: false,
            canManageMembers: false,
            canManageBilling: false
        }
    };
    return permissions[role] || permissions.member;
}

// POST /api/workspaces - Create new workspace
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, description, plan_type } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Workspace name is required' });
        }

        // Create workspace
        const workspace = await Workspace.create({
            name,
            description,
            owner_id: req.user.id,
            plan_type: plan_type || 'free',
            max_members: plan_type === 'enterprise' ? 999 : (plan_type === 'team' ? 5 : 1)
        });

        // Add creator as owner
        await WorkspaceMember.create({
            workspace_id: workspace.id,
            user_id: req.user.id,
            role: 'owner',
            permissions: getDefaultPermissions('owner')
        });

        res.status(201).json({
            message: 'Workspace created successfully',
            workspace
        });
    } catch (error) {
        console.error('Create workspace error:', error);
        res.status(500).json({ message: 'Failed to create workspace' });
    }
});

// GET /api/workspaces - List user's workspaces
router.get('/', requireAuth, async (req, res) => {
    try {
        const memberships = await WorkspaceMember.findAll({
            where: { user_id: req.user.id },
            include: [{
                model: Workspace,
                as: 'workspace'
            }]
        });

        const workspaces = memberships.map(m => ({
            ...m.workspace.toJSON(),
            role: m.role,
            permissions: m.permissions
        }));

        res.json({ workspaces });
    } catch (error) {
        console.error('List workspaces error:', error);
        res.status(500).json({ message: 'Failed to fetch workspaces' });
    }
});

// GET /api/workspaces/:id - Get workspace details
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user is member
        const membership = await WorkspaceMember.findOne({
            where: {
                workspace_id: id,
                user_id: req.user.id
            }
        });

        if (!membership) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const workspace = await Workspace.findByPk(id);

        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found' });
        }

        res.json({
            workspace,
            role: membership.role,
            permissions: membership.permissions
        });
    } catch (error) {
        console.error('Get workspace error:', error);
        res.status(500).json({ message: 'Failed to fetch workspace' });
    }
});

// PATCH /api/workspaces/:id - Update workspace
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        // Check if user is owner or manager
        const membership = await WorkspaceMember.findOne({
            where: {
                workspace_id: id,
                user_id: req.user.id
            }
        });

        if (!membership || !['owner', 'manager'].includes(membership.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const workspace = await Workspace.findByPk(id);

        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found' });
        }

        await workspace.update({ name, description });

        res.json({
            message: 'Workspace updated successfully',
            workspace
        });
    } catch (error) {
        console.error('Update workspace error:', error);
        res.status(500).json({ message: 'Failed to update workspace' });
    }
});

// DELETE /api/workspaces/:id - Delete workspace (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user is owner
        const membership = await WorkspaceMember.findOne({
            where: {
                workspace_id: id,
                user_id: req.user.id,
                role: 'owner'
            }
        });

        if (!membership) {
            return res.status(403).json({ message: 'Only workspace owner can delete' });
        }

        const workspace = await Workspace.findByPk(id);

        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found' });
        }

        await workspace.destroy();

        res.json({ message: 'Workspace deleted successfully' });
    } catch (error) {
        console.error('Delete workspace error:', error);
        res.status(500).json({ message: 'Failed to delete workspace' });
    }
});

// GET /api/workspaces/:id/members - List workspace members
router.get('/:id/members', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user is member
        const membership = await WorkspaceMember.findOne({
            where: {
                workspace_id: id,
                user_id: req.user.id
            }
        });

        if (!membership) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const members = await WorkspaceMember.findAll({
            where: { workspace_id: id },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email']
            }]
        });

        res.json({ members });
    } catch (error) {
        console.error('List members error:', error);
        res.status(500).json({ message: 'Failed to fetch members' });
    }
});

// POST /api/workspaces/:id/invite - Invite member
router.post('/:id/invite', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Check if user has permission to invite (Owner always has permission)
        const membership = await WorkspaceMember.findOne({
            where: {
                workspace_id: id,
                user_id: req.user.id
            }
        });

        if (!membership || (membership.role !== 'owner' && !membership.permissions?.canInviteMembers)) {
            return res.status(403).json({ message: 'No permission to invite members' });
        }

        const workspace = await Workspace.findByPk(id);

        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found' });
        }

        // Check member limit
        const memberCount = await WorkspaceMember.count({ where: { workspace_id: id } });
        if (memberCount >= workspace.max_members) {
            return res.status(400).json({ message: 'Member limit reached. Upgrade your plan.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            // Check if already a member
            const existingMember = await WorkspaceMember.findOne({
                where: {
                    workspace_id: id,
                    user_id: existingUser.id
                }
            });

            if (existingMember) {
                return res.status(400).json({ message: 'User is already a member' });
            }
        }

        // Generate invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invitation = await WorkspaceInvitation.create({
            workspace_id: id,
            email,
            role: role || 'member',
            token,
            invited_by: req.user.id,
            expires_at: expiresAt
        });

        // Send invitation email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const inviteLink = `${frontendUrl}/workspace/invite/${token}`;

        try {
            await emailService.sendSystemEmail(
                'workspace-invitation',
                email,
                {
                    inviterName: req.user.name,
                    workspaceName: workspace.name,
                    role: role || 'member',
                    link: inviteLink
                },
                {
                    userId: req.user.id,
                    priority: 'high'
                }
            );
            console.log(`📧 Invitation email queued for ${email}`);
        } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
            // We don't fail the request if email fails, but we log it
        }

        res.status(201).json({
            message: 'Invitation sent successfully',
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expires_at: invitation.expires_at
            }
        });
    } catch (error) {
        console.error('Invite member error:', error);
        res.status(500).json({ message: 'Failed to send invitation' });
    }
});

// PATCH /api/workspaces/:id/members/:userId - Update member role
router.patch('/:id/members/:userId', requireAuth, async (req, res) => {
    try {
        const { id, userId } = req.params;
        const { role } = req.body;

        // Check if user has permission
        const membership = await WorkspaceMember.findOne({
            where: {
                workspace_id: id,
                user_id: req.user.id
            }
        });

        if (!membership || !membership.permissions.canManageMembers) {
            return res.status(403).json({ message: 'No permission to manage members' });
        }

        const targetMember = await WorkspaceMember.findOne({
            where: {
                workspace_id: id,
                user_id: userId
            }
        });

        if (!targetMember) {
            return res.status(404).json({ message: 'Member not found' });
        }

        // Can't change owner role
        if (targetMember.role === 'owner') {
            return res.status(400).json({ message: 'Cannot change owner role' });
        }

        await targetMember.update({
            role,
            permissions: getDefaultPermissions(role)
        });

        res.json({
            message: 'Member role updated successfully',
            member: targetMember
        });
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ message: 'Failed to update member' });
    }
});

// DELETE /api/workspaces/:id/members/:userId - Remove member
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
    try {
        const { id, userId } = req.params;

        // Check if user has permission
        const membership = await WorkspaceMember.findOne({
            where: {
                workspace_id: id,
                user_id: req.user.id
            }
        });

        if (!membership || !membership.permissions.canManageMembers) {
            return res.status(403).json({ message: 'No permission to manage members' });
        }

        const targetMember = await WorkspaceMember.findOne({
            where: {
                workspace_id: id,
                user_id: userId
            }
        });

        if (!targetMember) {
            return res.status(404).json({ message: 'Member not found' });
        }

        // Can't remove owner
        if (targetMember.role === 'owner') {
            return res.status(400).json({ message: 'Cannot remove workspace owner' });
        }

        await targetMember.destroy();

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Failed to remove member' });
    }
});

// PUT /api/workspaces/:id/plan - Update workspace plan (Upgrade/Downgrade)
router.put('/:id/plan', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_type } = req.body;

        if (!plan_type) {
            return res.status(400).json({ message: 'Plan type is required' });
        }

        // Validate plan exists
        const plan = await SubscriptionPlan.findOne({
            where: {
                name: plan_type,
                isActive: true
            }
        });

        if (!plan && !['free', 'team', 'enterprise'].includes(plan_type)) {
            return res.status(400).json({ message: 'Invalid plan type' });
        }

        // Check permission (Owner only)
        const workspace = await Workspace.findByPk(id);
        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found' });
        }

        if (workspace.owner_id !== req.user.id) {
            return res.status(403).json({ message: 'Only the owner can change the plan' });
        }

        // Update plan and limits
        workspace.plan_type = plan_type;
        workspace.max_members = plan_type === 'enterprise' ? 999 : (plan_type === 'team' ? 5 : 1);
        await workspace.save();

        // Handle Coupon Usage if provided
        const { coupon_code } = req.body;
        if (coupon_code) {
            const { Coupon } = require('../models');
            const coupon = await Coupon.findOne({ where: { code: coupon_code.toUpperCase(), isActive: true } });
            if (coupon) {
                await coupon.increment('timesRedeemed');
                console.log(`🎟️ Coupon ${coupon_code} redeemed for workspace ${id}`);
            }
        }

        res.json({
            message: 'Plan updated successfully',
            workspace
        });
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ message: 'Failed to update plan' });
    }
});

// GET /api/workspaces/invite/:token - Validate invitation
router.get('/invite/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const invitation = await WorkspaceInvitation.findOne({
            where: { token },
            include: [
                { model: Workspace, as: 'workspace', attributes: ['id', 'name'] },
                { model: User, as: 'inviter', attributes: ['name', 'email'] }
            ]
        });

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        if (invitation.expires_at < new Date()) {
            return res.status(400).json({ message: 'Invitation expired' });
        }

        res.json({
            valid: true,
            workspace: invitation.workspace,
            inviter: invitation.inviter,
            email: invitation.email,
            role: invitation.role
        });
    } catch (error) {
        console.error('Validate invitation error:', error);
        res.status(500).json({ message: 'Failed to validate invitation' });
    }
});

// POST /api/workspaces/invite/:token/accept - Accept invitation
router.post('/invite/:token/accept', requireAuth, async (req, res) => {
    try {
        const { token } = req.params;

        const invitation = await WorkspaceInvitation.findOne({
            where: { token },
            include: [{ model: Workspace, as: 'workspace' }]
        });

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        if (invitation.expires_at < new Date()) {
            return res.status(400).json({ message: 'Invitation expired' });
        }

        // Check if user email matches invitation email
        // Optional: Allow accepting with different email? Usually strict.
        if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
            // For now, let's be lenient or check if we want to enforce this.
            // Usually, invitations are email-bound.
            // But if the user is logged in with a different email, we might want to warn them.
            // Let's enforce it for security.
            if (req.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
                return res.status(403).json({ message: 'This invitation was sent to a different email address' });
            }
        }

        // Check if already a member
        const existingMember = await WorkspaceMember.findOne({
            where: {
                workspace_id: invitation.workspace_id,
                user_id: req.user.id
            }
        });

        if (existingMember) {
            return res.status(400).json({ message: 'You are already a member of this workspace' });
        }

        // Add to workspace
        await WorkspaceMember.create({
            workspace_id: invitation.workspace_id,
            user_id: req.user.id,
            role: invitation.role,
            permissions: getDefaultPermissions(invitation.role)
        });

        // Delete invitation
        await invitation.destroy();

        res.json({
            message: 'Joined workspace successfully',
            workspaceId: invitation.workspace_id
        });
    } catch (error) {
        console.error('Accept invitation error:', error);
        res.status(500).json({ message: 'Failed to accept invitation' });
    }
});

module.exports = router;
