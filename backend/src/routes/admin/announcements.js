const express = require('express');
const router = express.Router();
const { User, EmailTemplate, EmailLog } = require('../../models');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/rbac');
const emailService = require('../../services/emailService');
const { Op } = require('sequelize');

router.use(requireAuth, requireAdmin);

// POST /api/admin/announcements/email - Send bulk email
router.post('/email', async (req, res) => {
    try {
        const { subject, message, audience, testEmail } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: 'Subject and message are required' });
        }

        // 1. Ensure "admin-announcement" template exists
        let template = await EmailTemplate.findOne({ where: { slug: 'admin-announcement' } });
        if (!template) {
            template = await EmailTemplate.create({
                name: 'Admin Announcement',
                slug: 'admin-announcement',
                subject: '{{subject}}',
                htmlContent: `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 20px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e1e4e8; }
  .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center; color: white; }
  .content { background: #ffffff; padding: 40px 30px; }
  .cta-box { text-align: center; margin: 30px 0; }
  .btn { background: #4f46e5; color: white !important; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; }
  .footer { background: #f9fafb; text-align: center; padding: 25px; font-size: 13px; color: #6b7280; border-top: 1px solid #edf2f7; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
        <h1 style="margin:0; font-size: 24px;">{{title}}</h1>
    </div>
    <div class="content">
        <p>Hello <strong>{{username}}</strong>,</p>
        <div style="margin: 20px 0;">
            {{{message}}}
        </div>
        {{#if ctaLink}}
        <div class="cta-box">
            <a href="{{ctaLink}}" class="btn">{{ctaText}}</a>
        </div>
        {{/if}}
    </div>
    <div class="footer">
        <p>Sent on {{date}}</p>
        <p>You received this email because you are a user of TargetChat.</p>
        <p><a href="{{unsubscribe_url}}" style="color: #4f46e5;">Unsubscribe from announcements</a></p>
    </div>
  </div>
</body>
</html>`,
                category: 'system',
                variables: ['subject', 'message', 'username', 'title', 'ctaLink', 'ctaText', 'date', 'unsubscribe_url'],
                isActive: true
            });
        }

        // 2. Handle Test Email
        if (testEmail) {
            await emailService.sendSystemEmail('admin-announcement', testEmail, {
                subject,
                message,
                username: 'Test User',
                title: subject,
                ctaLink: '#',
                ctaText: 'View Online',
                date: new Date().toLocaleDateString(),
                unsubscribe_url: '#'
            });
            return res.json({ message: `Test email sent to ${testEmail}` });
        }

        // 3. Determine Audience
        let whereClause = {};
        if (audience === 'active') {
            whereClause.isActive = true;
        } else if (audience === 'inactive') {
            whereClause.isActive = false;
        }
        // 'all' implies no filter

        const users = await User.findAll({
            where: whereClause,
            attributes: ['id', 'email', 'name']
        });

        if (users.length === 0) {
            return res.status(400).json({ message: 'No users found for this audience' });
        }

        // 4. Prepare Recipients for Bulk Send
        const recipients = users.map(user => ({
            email: user.email,
            userId: user.id,
            variables: {
                subject,
                message, // Pass the HTML message
                username: user.name || user.email.split('@')[0],
                name: user.name, // Keep for backward compatibility
                title: subject,
                ctaLink: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`,
                ctaText: 'View Dashboard',
                date: new Date().toLocaleDateString(),
                unsubscribe_url: `${process.env.APP_URL || 'http://localhost:3000'}/settings/notifications`
            }
        }));

        // 5. Send in Bulk
        // Note: emailService.sendBulk handles batching
        emailService.sendBulk('admin-announcement', recipients, { priority: 'normal' });

        res.json({
            message: `Announcement queued for ${users.length} users`,
            count: users.length
        });

    } catch (error) {
        console.error('Error sending announcement:', error);
        res.status(500).json({
            message: error.message || 'Server error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/admin/announcements/history - Get past announcements (from logs)
router.get('/history', async (req, res) => {
    try {
        const template = await EmailTemplate.findOne({ where: { slug: 'admin-announcement' } });
        if (!template) return res.json([]);

        const logs = await EmailLog.findAll({
            where: { templateId: template.id },
            order: [['created_at', 'DESC']],
            limit: 50,
            include: [{ model: User, as: 'user', attributes: ['name', 'email'] }] // Assuming association exists
        });

        // Group by subject/time roughly if needed, or just return logs
        // unique subjects might be better

        res.json(logs);
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
