const express = require('express');
const router = express.Router();
const { Lead, Widget, User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { Parser } = require('json2csv');

// GET /api/leads - List all leads with filters
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { widget_id, status, search, page = 1, limit = 20 } = req.query;

        const where = { ownerUserId: userId };

        // Filter by widget
        if (widget_id) {
            where.widgetId = widget_id;
        }

        // Filter by status
        if (status && status !== 'all') {
            where.status = status;
        }

        // Search by name, email, phone, or company
        if (search) {
            const { Op } = require('sequelize');
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
                { company: { [Op.like]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows: leads } = await Lead.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        res.json({
            leads,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching leads:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/leads - Create new lead (Public/Protected)
router.post('/', async (req, res) => {
    try {
        const { widget_id, name, email, phone, company, custom_field, custom_data } = req.body;

        if (!widget_id) {
            return res.status(400).json({ message: 'Widget ID is required' });
        }

        const widget = await Widget.findByPk(widget_id);
        if (!widget) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        // Check if lead already exists (by email)
        let lead;
        if (email) {
            lead = await Lead.findOne({
                where: {
                    widgetId: widget_id,
                    email
                }
            });
        }

        if (lead) {
            // Update existing lead
            await lead.update({
                name: name || lead.name,
                phone: phone || lead.phone,
                company: company || lead.company,
                customField: custom_field || lead.customField,
                customData: { ...lead.customData, ...custom_data },
                lastMessage: new Date()
            });
        } else {
            // Create new lead
            lead = await Lead.create({
                widgetId: widget_id,
                ownerUserId: widget.userId,
                name: name || 'Visitor',
                email,
                phone,
                company,
                customField: custom_field,
                customData: custom_data || {},
                status: 'new',
                lastMessage: new Date()
            });
        }

        // Emit socket event for real-time dashboard update
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${widget.userId}`).emit('lead:created', lead);
        }

        res.status(201).json(lead);
    } catch (err) {
        console.error('Error creating lead:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/leads/:id - Get lead details
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const lead = await Lead.findOne({
            where: { id, ownerUserId: userId },
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        res.json(lead);
    } catch (err) {
        console.error('Error fetching lead:', err);
        res.status(500).json({ message: 'Server error' });
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/leads/:id - Update lead
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { status, tags, notes, name, email, phone, company } = req.body;

        const lead = await Lead.findOne({
            where: { id, ownerUserId: userId }
        });

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        await lead.update({
            ...(status && { status }),
            ...(tags && { tags }),
            ...(notes !== undefined && { notes }),
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(company && { company })
        });

        res.json(lead);
    } catch (err) {
        console.error('Error updating lead:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const lead = await Lead.findOne({
            where: { id, ownerUserId: userId }
        });

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        await lead.destroy();
        res.json({ message: 'Lead deleted successfully' });
    } catch (err) {
        console.error('Error deleting lead:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/leads/export - Export leads to CSV
router.get('/export/csv', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { widget_id, status } = req.query;

        const where = { ownerUserId: userId };

        if (widget_id) {
            where.widgetId = widget_id;
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        const leads = await Lead.findAll({
            where,
            order: [['createdAt', 'DESC']],
            raw: true
        });

        const fields = ['id', 'name', 'email', 'phone', 'company', 'status', 'createdAt', 'lastMessage'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(leads);

        res.header('Content-Type', 'text/csv');
        res.attachment('leads.csv');
        res.send(csv);
    } catch (err) {
        console.error('Error exporting leads:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
