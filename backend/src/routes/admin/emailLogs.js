const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { EmailLog, EmailTemplate, User } = require('../../models');
const { Op } = require('sequelize');
const emailService = require('../../services/emailService');

// Apply auth middleware first, then admin check
router.use(requireAuth);
router.use(requireAdmin);


/**
 * GET /api/admin/email-logs
 * List email logs with filters and pagination
 */
router.get('/', async (req, res) => {
    try {
        const {
            status,
            recipient,
            templateId,
            page = 1,
            limit = 50,
            startDate,
            endDate
        } = req.query;

        const where = {};

        if (status) where.status = status;
        if (recipient) where.recipientEmail = { [Op.like]: `%${recipient}%` };
        if (templateId) where.templateId = templateId;

        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) where.created_at[Op.gte] = new Date(startDate);
            if (endDate) where.created_at[Op.lte] = new Date(endDate);
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await EmailLog.findAndCountAll({
            where,
            include: [
                {
                    model: EmailTemplate,
                    as: 'template',
                    attributes: ['id', 'name', 'slug', 'category']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            logs: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching email logs:', error);
        res.status(500).json({ message: 'Failed to fetch email logs', error: error.message });
    }
});

/**
 * GET /api/admin/email-logs/:id
 * Get single email log details
 */
router.get('/:id', async (req, res) => {
    try {
        const log = await EmailLog.findByPk(req.params.id, {
            include: [
                {
                    model: EmailTemplate,
                    as: 'template',
                    attributes: ['id', 'name', 'slug', 'category', 'subject']
                }
            ]
        });

        if (!log) {
            return res.status(404).json({ message: 'Email log not found' });
        }

        res.json(log);
    } catch (error) {
        console.error('Error fetching email log:', error);
        res.status(500).json({ message: 'Failed to fetch email log', error: error.message });
    }
});

/**
 * POST /api/admin/email-logs/:id/retry
 * Retry a failed email
 */
router.post('/:id/retry', async (req, res) => {
    try {
        const result = await emailService.retryEmail(parseInt(req.params.id));

        res.json({
            message: 'Email retry queued successfully',
            jobId: result.jobId,
            logId: result.logId
        });
    } catch (error) {
        console.error('Error retrying email:', error);
        res.status(500).json({ message: 'Failed to retry email', error: error.message });
    }
});

/**
 * GET /api/admin/email-logs/stats
 * Get email statistics for analytics dashboard
 */
router.get('/stats/analytics', async (req, res) => {
    try {
        const { period = '7d' } = req.query;

        // Calculate date range
        const now = new Date();
        const startDate = new Date();

        switch (period) {
            case '24h':
                startDate.setHours(now.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        // Total emails sent
        const totalSent = await EmailLog.count({
            where: {
                created_at: { [Op.gte]: startDate }
            }
        });

        // Status breakdown
        const statusCounts = await EmailLog.findAll({
            where: {
                created_at: { [Op.gte]: startDate }
            },
            attributes: [
                'status',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        // Category breakdown
        const categoryStats = await EmailLog.findAll({
            where: {
                created_at: { [Op.gte]: startDate }
            },
            include: [
                {
                    model: EmailTemplate,
                    as: 'template',
                    attributes: ['category']
                }
            ],
            attributes: [
                [require('sequelize').fn('COUNT', require('sequelize').col('EmailLog.id')), 'count']
            ],
            group: ['template.category'],
            raw: true
        });

        // Top templates by usage
        const topTemplates = await EmailLog.findAll({
            where: {
                created_at: { [Op.gte]: startDate }
            },
            include: [
                {
                    model: EmailTemplate,
                    as: 'template',
                    attributes: ['id', 'name', 'slug']
                }
            ],
            attributes: [
                'templateId',
                [require('sequelize').fn('COUNT', require('sequelize').col('EmailLog.id')), 'count']
            ],
            group: ['templateId', 'template.id', 'template.name', 'template.slug'],
            order: [[require('sequelize').literal('count'), 'DESC']],
            limit: 10,
            raw: true
        });

        // Calculate rates
        const delivered = statusCounts.find(s => s.status === 'delivered')?.count || 0;
        const opened = statusCounts.find(s => s.status === 'opened')?.count || 0;
        const failed = statusCounts.find(s => s.status === 'failed')?.count || 0;
        const bounced = statusCounts.find(s => s.status === 'bounced')?.count || 0;

        const deliveryRate = totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(2) : 0;
        const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(2) : 0;
        const failureRate = totalSent > 0 ? ((failed / totalSent) * 100).toFixed(2) : 0;
        const bounceRate = totalSent > 0 ? ((bounced / totalSent) * 100).toFixed(2) : 0;

        res.json({
            period,
            totalSent,
            statusBreakdown: statusCounts,
            categoryBreakdown: categoryStats,
            topTemplates,
            rates: {
                delivery: parseFloat(deliveryRate),
                open: parseFloat(openRate),
                failure: parseFloat(failureRate),
                bounce: parseFloat(bounceRate)
            }
        });
    } catch (error) {
        console.error('Error fetching email stats:', error);
        res.status(500).json({ message: 'Failed to fetch email stats', error: error.message });
    }
});

module.exports = router;
