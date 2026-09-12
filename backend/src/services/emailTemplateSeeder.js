const { EmailTemplate } = require('../models');

const BRAND_NAME = process.env.APP_NAME || 'TargetChat';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@targetchat.com';

/**
 * Shared branded layout for all system email templates.
 * Table-based with inline styles for maximum email-client compatibility.
 * NOTE: templateEngine only supports {{variable}} substitution (no conditionals),
 * so every placeholder used here must be supplied by all callers of that slug.
 */
function layout({ preheader, heading, intro, body, cta, closing }) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 32px;text-align:center;">
<div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0.5px;">${BRAND_NAME}</div>
</td></tr>
<tr><td style="padding:36px 32px 8px 32px;">
<h1 style="margin:0 0 12px 0;font-size:22px;color:#0f172a;">${heading}</h1>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">${intro}</p>
${body || ''}
${cta ? `<div style="text-align:center;margin:28px 0 8px 0;"><a href="${cta.url}" style="display:inline-block;background-color:#4f46e5;color:#ffffff !important;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;">${cta.label}</a></div>` : ''}
<p style="margin:20px 0 0 0;font-size:15px;line-height:1.7;color:#334155;">${closing || 'Thanks,<br>The ' + BRAND_NAME + ' Team'}</p>
</td></tr>
<tr><td style="background-color:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">You received this email because you have a ${BRAND_NAME} account.<br>Need help? Contact us at ${SUPPORT_EMAIL}.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function detailRow(label, value) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;"><tr><td style="padding:12px 16px;font-size:14px;color:#475569;">${label}</td><td align="right" style="padding:12px 16px;font-size:14px;font-weight:bold;color:#0f172a;">${value}</td></tr></table>`;
}

const TEMPLATES = [
    {
        name: 'Welcome & Email Verification',
        slug: 'welcome',
        category: 'auth',
        subject: 'Welcome to ' + BRAND_NAME + ', {{username}} — verify your email',
        variables: ['username', 'verificationLink', 'email'],
        htmlBody: layout({
            preheader: 'Confirm your email to activate your account.',
            heading: 'Welcome aboard, {{username}}!',
            intro: 'Your account (<strong>{{email}}</strong>) was created successfully. Please verify your email address to unlock the full platform.',
            cta: { url: '{{verificationLink}}', label: 'Verify My Email' },
            body: '<p style="font-size:13px;color:#64748b;">If the button does not work, copy and paste this link into your browser:<br><span style="color:#4f46e5;word-break:break-all;">{{verificationLink}}</span></p>'
        }),
        textBody: 'Welcome to ' + BRAND_NAME + ', {{username}}! Verify your email here: {{verificationLink}}'
    },
    {
        name: 'Email Verification Code',
        slug: 'email-verification',
        category: 'auth',
        subject: 'Your ' + BRAND_NAME + ' verification code: {{otp}}',
        variables: ['username', 'verificationLink', 'otp', 'expiresIn'],
        htmlBody: layout({
            preheader: 'Use this code to verify your email address.',
            heading: 'Verify your email',
            intro: 'Hi {{username}}, use the verification code below to confirm your email address. It expires in {{expiresIn}}.',
            body: '<div style="text-align:center;margin:24px 0;"><span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:8px;color:#4f46e5;background-color:#eef2ff;border:1px dashed #c7d2fe;border-radius:12px;padding:12px 24px 12px 32px;">{{otp}}</span></div>',
            cta: { url: '{{verificationLink}}', label: 'Verify in Browser' }
        }),
        textBody: 'Hi {{username}}, your verification code is {{otp}} (expires in {{expiresIn}}). Or verify here: {{verificationLink}}'
    },
    {
        name: 'Password Reset',
        slug: 'password-reset',
        category: 'auth',
        subject: 'Reset your ' + BRAND_NAME + ' password',
        variables: ['username', 'resetLink', 'expiresIn', 'email'],
        htmlBody: layout({
            preheader: 'Reset your password within {{expiresIn}}.',
            heading: 'Reset your password',
            intro: 'Hi {{username}}, we received a request to reset the password for <strong>{{email}}</strong>. This link expires in {{expiresIn}}. If you did not request this, you can safely ignore this email.',
            cta: { url: '{{resetLink}}', label: 'Reset Password' }
        }),
        textBody: 'Hi {{username}}, reset your password (expires in {{expiresIn}}): {{resetLink}}'
    },
    {
        name: 'Workspace Invitation',
        slug: 'workspace-invitation',
        category: 'system',
        subject: '{{inviterName}} invited you to join {{workspaceName}} on ' + BRAND_NAME,
        variables: ['inviterName', 'workspaceName', 'role', 'link'],
        htmlBody: layout({
            preheader: 'You have been invited to collaborate.',
            heading: 'You are invited!',
            intro: '<strong>{{inviterName}}</strong> invited you to join the <strong>{{workspaceName}}</strong> workspace as <strong>{{role}}</strong>. Accept the invitation to start collaborating.',
            cta: { url: '{{link}}', label: 'Accept Invitation' },
            body: '<p style="font-size:13px;color:#64748b;">Invitations expire after 7 days.</p>'
        }),
        textBody: '{{inviterName}} invited you to join {{workspaceName}} as {{role}}. Accept here: {{link}}'
    },
    {
        name: 'Payment Success',
        slug: 'payment-success',
        category: 'billing',
        subject: 'Payment received — {{plan}}',
        variables: ['username', 'amount', 'plan', 'date', 'invoiceUrl', 'nextBillingDate'],
        htmlBody: layout({
            preheader: 'Your payment of {{amount}} was successful.',
            heading: 'Payment successful 🎉',
            intro: 'Hi {{username}}, we have received your payment. Your subscription is active.',
            body: detailRow('Plan', '{{plan}}') + detailRow('Amount charged', '{{amount}}') + detailRow('Payment date', '{{date}}') + detailRow('Next billing date', '{{nextBillingDate}}'),
            cta: { url: '{{invoiceUrl}}', label: 'View Invoice' }
        }),
        textBody: 'Hi {{username}}, payment of {{amount}} for {{plan}} received on {{date}}. Next billing: {{nextBillingDate}}. Invoice: {{invoiceUrl}}'
    },
    {
        name: 'Payment Failed',
        slug: 'payment-failed',
        category: 'billing',
        subject: 'Action needed: your {{plan}} payment failed',
        variables: ['username', 'amount', 'plan', 'reason', 'retryUrl', 'supportEmail'],
        htmlBody: layout({
            preheader: 'Your payment could not be processed.',
            heading: 'Payment failed',
            intro: 'Hi {{username}}, we could not charge <strong>{{amount}}</strong> for your <strong>{{plan}}</strong> subscription.',
            body: detailRow('Reason', '{{reason}}') + '<p style="font-size:13px;color:#64748b;">Please update your payment method to avoid interruption. Reply to this email or contact {{supportEmail}} if you need help.</p>',
            cta: { url: '{{retryUrl}}', label: 'Retry Payment' }
        }),
        textBody: 'Hi {{username}}, your {{plan}} payment of {{amount}} failed ({{reason}}). Retry: {{retryUrl}} — support: {{supportEmail}}'
    },
    {
        name: 'Subscription Canceled',
        slug: 'subscription-canceled',
        category: 'billing',
        subject: 'Your {{plan}} subscription was canceled',
        variables: ['username', 'plan', 'expiresAt', 'feedbackUrl'],
        htmlBody: layout({
            preheader: 'Your subscription details inside.',
            heading: 'Subscription canceled',
            intro: 'Hi {{username}}, your <strong>{{plan}}</strong> subscription was canceled. You keep access until <strong>{{expiresAt}}</strong>. We would love to know what we could do better.',
            cta: { url: '{{feedbackUrl}}', label: 'Share Feedback' }
        }),
        textBody: 'Hi {{username}}, your {{plan}} subscription was canceled. Access until {{expiresAt}}. Feedback: {{feedbackUrl}}'
    },
    {
        name: 'Workflow Completed',
        slug: 'workflow-complete',
        category: 'workflow',
        subject: 'Workflow finished: {{workflowName}}',
        variables: ['username', 'workflowName', 'status', 'completedAt', 'resultUrl', 'duration'],
        htmlBody: layout({
            preheader: '{{workflowName}} completed {{status}}.',
            heading: 'Workflow completed ✅',
            intro: 'Hi {{username}}, your workflow <strong>{{workflowName}}</strong> finished with status <strong>{{status}}</strong>.',
            body: detailRow('Completed at', '{{completedAt}}') + detailRow('Duration', '{{duration}}'),
            cta: { url: '{{resultUrl}}', label: 'View Result' }
        }),
        textBody: 'Hi {{username}}, workflow {{workflowName}} finished ({{status}}) at {{completedAt}}. Duration: {{duration}}. Result: {{resultUrl}}'
    },
    {
        name: 'Workflow Failed',
        slug: 'workflow-failed',
        category: 'workflow',
        subject: 'Workflow failed: {{workflowName}}',
        variables: ['username', 'workflowName', 'error', 'failedAt', 'supportUrl', 'workflowUrl'],
        htmlBody: layout({
            preheader: '{{workflowName}} encountered an error.',
            heading: 'Workflow failed ⚠️',
            intro: 'Hi {{username}}, your workflow <strong>{{workflowName}}</strong> failed at {{failedAt}}.',
            body: detailRow('Error', '{{error}}'),
            cta: { url: '{{workflowUrl}}', label: 'Open Workflow' }
        }),
        textBody: 'Hi {{username}}, workflow {{workflowName}} failed at {{failedAt}}. Error: {{error}}. Open: {{workflowUrl}} — support: {{supportUrl}}'
    },
    {
        name: 'Admin Announcement',
        slug: 'admin-announcement',
        category: 'system',
        subject: '{{subject}}',
        variables: ['subject', 'message', 'username', 'title', 'ctaLink', 'ctaText', 'date', 'unsubscribe_url'],
        htmlBody: layout({
            preheader: '{{title}}',
            heading: '{{title}}',
            intro: 'Hello <strong>{{username}}</strong>,',
            body: '<div style="font-size:15px;line-height:1.7;color:#334155;">{{message}}</div>',
            cta: { url: '{{ctaLink}}', label: '{{ctaText}}' },
            closing: 'Sent on {{date}}.<br><a href="{{unsubscribe_url}}" style="color:#4f46e5;">Unsubscribe from announcements</a>'
        }),
        textBody: '{{title}} — {{message}} ({{ctaText}}: {{ctaLink}}). Sent on {{date}}.'
    }
];

/**
 * Seed all default email templates (idempotent).
 * Existing slugs are left untouched so admin customizations are preserved.
 * @returns {Promise<{created:number,total:number}>}
 */
async function seedEmailTemplates() {
    let created = 0;
    for (const tpl of TEMPLATES) {
        const [, wasCreated] = await EmailTemplate.findOrCreate({
            where: { slug: tpl.slug, language: 'en' },
            defaults: { ...tpl, language: 'en', isActive: true }
        });
        if (wasCreated) created += 1;
    }
    return { created, total: TEMPLATES.length };
}

/**
 * Ensure a single template exists (used as a self-healing step before sending).
 */
async function ensureEmailTemplate(slug) {
    const existing = await EmailTemplate.findOne({ where: { slug, language: 'en', isActive: true } });
    if (existing) return existing;
    await seedEmailTemplates();
    return EmailTemplate.findOne({ where: { slug, language: 'en', isActive: true } });
}

module.exports = { seedEmailTemplates, ensureEmailTemplate, TEMPLATES };
