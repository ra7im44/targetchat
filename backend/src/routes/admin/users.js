const express = require('express');
const router = express.Router();
const { User, Chat, Message, ActivityLog } = require('../../models');
const { logActivity } = require('../../utils/logger');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const { parsePagination } = require('../../utils/pagination');

router.use(requireAuth, requireAdmin);

// GET /api/admin/users - List all users with pagination and filters
router.get('/', async (req, res) => {
    try {
        const {
            search = '',
            filter = 'all' // all, admin, user, active, inactive
        } = req.query;
        const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 10 });

        // Build where clause
        const where = {};

        // Search by name or email
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        // Filter by role or status
        if (filter === 'admin') {
            where.role = 'admin';
        } else if (filter === 'user') {
            where[Op.or] = [
                { role: 'user' },
                { role: null }
            ];
        } else if (filter === 'active') {
            where[Op.or] = [
                { isActive: true },
                { isActive: null }
            ];
        } else if (filter === 'inactive') {
            where.isActive = false;
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: ['id', 'name', 'email', 'role', 'isActive', 'lastLogin', 'lastIp', 'registrationIp', 'created_at'],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        res.json({
            users: rows,
            pagination: {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/admin/users/:id - Get user details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, {
            attributes: ['id', 'name', 'email', 'role', 'isActive', 'lastLogin', 'lastIp', 'registrationIp', 'created_at']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/admin/users - Create new user
router.post('/', async (req, res) => {
    try {
        const { name, email, password, role = 'user', isActive = true } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            isActive
        });

        // Return user without password
        const userResponse = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        };

        res.status(201).json(userResponse);
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH /api/admin/users/:id - Update user
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if email is being changed and if it already exists
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already exists' });
            }
        }

        // Update user
        await user.update({
            ...(name && { name }),
            ...(email && { email })
        });

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH /api/admin/users/:id/role - Change user role
router.patch('/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role || !['admin', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be "admin" or "user"' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent changing own role
        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot change your own role' });
        }

        await user.update({ role });

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });
    } catch (err) {
        console.error('Error changing user role:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH /api/admin/users/:id/status - Activate/Deactivate user
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: 'isActive must be a boolean' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deactivating own account
        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot deactivate your own account' });
        }

        await user.update({ isActive });

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });
    } catch (err) {
        console.error('Error changing user status:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/admin/users/:id/logs - Get user activity logs
router.get('/:id/logs', async (req, res) => {
    try {
        const { id } = req.params;
        const logs = await ActivityLog.findAll({
            where: { user_id: id },
            order: [['created_at', 'DESC']],
            limit: 50
        });
        res.json(logs);
    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting own account
        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // Get counts of related data
        const chatCount = await Chat.count({ where: { userId: id } });
        const messageCount = await Message.count({
            include: [{
                model: Chat,
                as: 'chat',
                where: { userId: id },
                attributes: []
            }]
        });

        // Delete user (cascade will handle related data)
        await user.destroy();

        await logActivity(req.user.id, 'DELETE_USER', { targetUserId: id, targetEmail: user.email }, req);

        res.json({
            message: 'User deleted successfully',
            deletedData: {
                chats: chatCount,
                messages: messageCount
            }
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/admin/users/:id/stats - Get user statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const chatCount = await Chat.count({ where: { userId: id } });
        const messageCount = await Message.count({
            include: [{
                model: Chat,
                as: 'chat', // Required alias
                where: { userId: id },
                attributes: []
            }]
        });

        // Get recent chats
        const recentChats = await Chat.findAll({
            where: { userId: id },
            order: [['updated_at', 'DESC']],
            limit: 5,
            attributes: ['id', 'title', 'updated_at']
        });

        res.json({
            userId: id,
            userName: user.name,
            userEmail: user.email,
            totalChats: chatCount,
            totalMessages: messageCount,
            recentChats
        });
    } catch (err) {
        console.error('Error fetching user stats:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
