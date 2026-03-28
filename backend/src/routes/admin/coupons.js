const express = require('express');
const router = express.Router();
const { Coupon } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { Op } = require('sequelize');

router.use(requireAuth, requireAdmin);

// GET /api/admin/coupons - List all coupons
router.get('/', async (req, res) => {
    try {
        const coupons = await Coupon.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(coupons);
    } catch (err) {
        console.error('Error fetching coupons:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/coupons - Create coupon
router.post('/', async (req, res) => {
    try {
        const { code, discountType, discountValue, maxRedemptions, expiresAt, isActive, description } = req.body;

        if (!code || !discountValue) {
            return res.status(400).json({ message: 'Code and Discount Value are required' });
        }

        const existing = await Coupon.findOne({ where: { code: code.toUpperCase() } });
        if (existing) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        const coupon = await Coupon.create({
            code,
            discountType: discountType || 'percentage',
            discountValue,
            maxRedemptions: maxRedemptions || null,
            expiresAt: expiresAt || null,
            isActive: isActive !== undefined ? isActive : true,
            description
        });

        res.status(201).json(coupon);
    } catch (err) {
        console.error('Error creating coupon:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/admin/coupons/:id - Update coupon
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const coupon = await Coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        await coupon.update(updates);

        res.json(coupon);
    } catch (err) {
        console.error('Error updating coupon:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/coupons/:id - Delete coupon
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        await coupon.destroy();
        res.json({ message: 'Coupon deleted' });
    } catch (err) {
        console.error('Error deleting coupon:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
