const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const { EmailTemplate } = require('../../models');
const templateEngine = require('../../services/templateEngine');
const emailService = require('../../services/emailService');
const { seedEmailTemplates } = require('../../services/emailTemplateSeeder');

// Apply auth middleware first, then admin check
router.use(requireAuth);
router.use(requireAdmin);


/**
 * GET /api/admin/email-templates
 * List all email templates
 */
router.get('/', async (req, res) => {
    try {
        const { category, language, active } = req.query;

        const where = {};
        if (category) where.category = category;
        if (language) where.language = language;
        if (active !== undefined) where.isActive = active === 'true';

        const templates = await EmailTemplate.findAll({
            where,
            order: [['category', 'ASC'], ['name', 'ASC']]
        });

        // Auto-seed senior defaults on empty tables (mirrors admin settings behavior)
        if (templates.length === 0 && Object.keys(where).length === 0) {
            await seedEmailTemplates();
            const seeded = await EmailTemplate.findAll({
                order: [['category', 'ASC'], ['name', 'ASC']]
            });
            return res.json(seeded);
        }

        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ message: 'Failed to fetch templates', error: error.message });
    }
});

/**
 * GET /api/admin/email-templates/:id
 * Get single template by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const template = await EmailTemplate.findByPk(req.params.id);

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ message: 'Failed to fetch template', error: error.message });
    }
});

/**
 * POST /api/admin/email-templates
 * Create new email template
 */
router.post('/', async (req, res) => {
    try {
        const { name, slug, category, subject, htmlBody, textBody, variables, language, isActive } = req.body;

        // Validate required fields
        if (!name || !slug || !category || !subject || !htmlBody) {
            return res.status(400).json({
                message: 'Missing required fields: name, slug, category, subject, htmlBody'
            });
        }

        // Check if slug already exists
        const existing = await EmailTemplate.findOne({ where: { slug } });
        if (existing) {
            return res.status(409).json({ message: 'Template with this slug already exists' });
        }

        const template = await EmailTemplate.create({
            name,
            slug,
            category,
            subject,
            htmlBody,
            textBody,
            variables: variables || [],
            language: language || 'en',
            isActive: isActive !== undefined ? isActive : true
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ message: 'Failed to create template', error: error.message });
    }
});

/**
 * PATCH /api/admin/email-templates/:id
 * Update existing template
 */
router.patch('/:id', async (req, res) => {
    try {
        const template = await EmailTemplate.findByPk(req.params.id);

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        const { name, slug, category, subject, htmlBody, textBody, variables, language, isActive } = req.body;

        // If slug is being changed, check for conflicts
        if (slug && slug !== template.slug) {
            const existing = await EmailTemplate.findOne({ where: { slug } });
            if (existing) {
                return res.status(409).json({ message: 'Template with this slug already exists' });
            }
        }

        // Update fields
        if (name) template.name = name;
        if (slug) template.slug = slug;
        if (category) template.category = category;
        if (subject) template.subject = subject;
        if (htmlBody) template.htmlBody = htmlBody;
        if (textBody !== undefined) template.textBody = textBody;
        if (variables) template.variables = variables;
        if (language) template.language = language;
        if (isActive !== undefined) template.isActive = isActive;

        await template.save();

        res.json(template);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ message: 'Failed to update template', error: error.message });
    }
});

/**
 * DELETE /api/admin/email-templates/:id
 * Delete template
 */
router.delete('/:id', async (req, res) => {
    try {
        const template = await EmailTemplate.findByPk(req.params.id);

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        await template.destroy();

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ message: 'Failed to delete template', error: error.message });
    }
});

/**
 * POST /api/admin/email-templates/:id/preview
 * Preview template with sample data
 */
router.post('/:id/preview', async (req, res) => {
    try {
        const { sampleVariables } = req.body;

        const { subject, html, text } = await templateEngine.preview(
            parseInt(req.params.id),
            sampleVariables || {}
        );

        res.json({ subject, html, text });
    } catch (error) {
        console.error('Error previewing template:', error);
        res.status(500).json({ message: 'Failed to preview template', error: error.message });
    }
});

/**
 * POST /api/admin/email-templates/:id/test
 * Send test email
 */
router.post('/:id/test', async (req, res) => {
    try {
        const { testEmail, testVariables } = req.body;

        if (!testEmail) {
            return res.status(400).json({ message: 'testEmail is required' });
        }

        const template = await EmailTemplate.findByPk(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        // Default variables for testing based on template slug
        const defaultVariables = {
            'welcome': {
                username: 'Test User',
                verificationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=test`,
                email: testEmail
            },
            'email-verification': {
                username: 'Test User',
                verificationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=test`,
                otp: '123456',
                expiresIn: '10 minutes'
            },
            'password-reset': {
                username: 'Test User',
                resetLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=test`,
                expiresIn: '1 hour',
                email: testEmail
            },
            'payment-success': {
                username: 'Test User',
                amount: '$29.00',
                plan: 'Pro Plan',
                date: new Date().toLocaleDateString(),
                invoiceUrl: '#',
                nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
            },
            'payment-failed': {
                username: 'Test User',
                amount: '$29.00',
                plan: 'Pro Plan',
                reason: 'Insufficient funds',
                retryUrl: '#',
                supportEmail: 'support@targetchat.com'
            },
            'subscription-canceled': {
                username: 'Test User',
                plan: 'Pro Plan',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                feedbackUrl: '#'
            },
            'workflow-complete': {
                username: 'Test User',
                workflowName: 'Test Workflow',
                status: 'Completed',
                completedAt: new Date().toLocaleString(),
                duration: '2m 15s',
                resultUrl: '#'
            },
            'workflow-failed': {
                username: 'Test User',
                workflowName: 'Test Workflow',
                error: 'Simulation error for testing',
                failedAt: new Date().toLocaleString(),
                supportUrl: '#',
                workflowUrl: '#'
            },
            'admin-announcement': {
                username: 'Test User',
                title: 'Important Update',
                message: 'This is a test announcement to verify email delivery.',
                ctaLink: '#',
                ctaText: 'Learn More',
                date: new Date().toLocaleDateString()
            }
        };

        // Merge defaults with provided mock variables
        const variables = {
            ...defaultVariables[template.slug],
            ...defaultVariables[template.category], // Fallback to category defaults
            ...(testVariables || {}),
            email: testEmail // Ensure email is always present
        };

        // Send test email
        const result = await emailService.sendSystemEmail(
            template.slug,
            testEmail,
            variables,
            { priority: 'urgent' }
        );

        res.json({
            message: 'Test email sent successfully',
            jobId: result.jobId,
            logId: result.logId
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ message: 'Failed to send test email', error: error.message });
    }
});

module.exports = router;
