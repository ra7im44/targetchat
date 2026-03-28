require('dotenv').config();
const { EmailTemplate } = require('../src/models');

/**
 * Default Email Templates
 * These will be seeded into the database
 */
const defaultTemplates = [
    {
        name: 'Welcome Email',
        slug: 'welcome',
        category: 'auth',
        subject: 'Welcome to TargetChat, {{username}}! 🎉',
        htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; }
          .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">Welcome to TargetChat!</h1>
          </div>
          <div class="content">
            <h2>Hi {{username}},</h2>
            <p>We're thrilled to have you on board! 🚀</p>
            <p>TargetChat is your intelligent AI-powered chat platform with advanced workflow automation. Get ready to experience seamless conversations powered by cutting-edge AI.</p>
            <p>To get started, please verify your email address:</p>
            <center>
              <a href="{{verificationLink}}" class="button">Verify Email Address</a>
            </center>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">{{verificationLink}}</p>
            <p>Happy chatting!<br>The TargetChat Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TargetChat. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
        variables: ['username', 'verificationLink', 'email'],
        language: 'en',
        isActive: true
    },

    {
        name: 'Email Verification',
        slug: 'email-verification',
        category: 'auth',
        subject: 'Verify your email - TargetChat',
        htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .otp { font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hi {{username}},</h2>
            <p>Please verify your email address to activate your TargetChat account.</p>
            <p>Click the button below to verify:</p>
            <center>
              <a href="{{verificationLink}}" class="button">Verify Email</a>
            </center>
            <p>Or use this verification code:</p>
            <div class="otp">{{otp}}</div>
            <p><small>This link expires in {{expiresIn}}.</small></p>
          </div>
        </div>
      </body>
      </html>
    `,
        variables: ['username', 'verificationLink', 'otp', 'expiresIn'],
        language: 'en',
        isActive: true
    },

    {
        name: 'Password Reset',
        slug: 'password-reset',
        category: 'auth',
        subject: 'Reset your password - TargetChat',
        htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF5722; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 14px 28px; background: #FF5722; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi {{username}},</h2>
            <p>We received a request to reset your password for your TargetChat account ({{email}}).</p>
            <p>Click the button below to reset your password:</p>
            <center>
              <a href="{{resetLink}}" class="button">Reset Password</a>
            </center>
            <p><small>This link expires in {{expiresIn}}.</small></p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
        variables: ['username', 'resetLink', 'expiresIn', 'email'],
        language: 'en',
        isActive: true
    },

    {
        name: 'Payment Success',
        slug: 'payment-success',
        category: 'billing',
        subject: 'Payment Received - {{plan}}',
        htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .invoice { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
          .total { font-size: 24px; font-weight: bold; color: #4CAF50; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Successful!</h1>
          </div>
          <div class="content">
            <h2>Hi {{username}},</h2>
            <p>Thank you for your payment! Your subscription has been renewed.</p>
            <div class="invoice">
              <h3>Payment Details</h3>
              <div class="invoice-row">
                <span>Plan:</span>
                <strong>{{plan}}</strong>
              </div>
              <div class="invoice-row">
                <span>Amount:</span>
                <strong class="total">{{amount}}</strong>
              </div>
              <div class="invoice-row">
                <span>Date:</span>
                <span>{{date}}</span>
              </div>
              <div class="invoice-row">
                <span>Next Billing:</span>
                <span>{{nextBillingDate}}</span>
              </div>
            </div>
            <p><a href="{{invoiceUrl}}" style="color: #4CAF50; font-weight: bold;">Download Invoice (PDF)</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
        variables: ['username', 'amount', 'plan', 'date', 'invoiceUrl', 'nextBillingDate'],
        language: 'en',
        isActive: true
    },

    {
        name: 'Payment Failed',
        slug: 'payment-failed',
        category: 'billing',
        subject: '⚠️ Payment Failed - Action Required',
        htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 14px 28px; background: #f44336; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .error-box { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Payment Failed</h1>
          </div>
          <div class="content">
            <h2>Hi {{username}},</h2>
            <p>We were unable to process your payment for {{plan}}.</p>
            <div class="error-box">
              <strong>Reason:</strong> {{reason}}
            </div>
            <p><strong>Amount Due:</strong> {{amount}}</p>
            <p>Please update your payment method and try again:</p>
            <center>
              <a href="{{retryUrl}}" class="button">Update Payment Method</a>
            </center>
            <p>If you need assistance, contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
        variables: ['username', 'amount', 'plan', 'retryUrl', 'reason', 'supportEmail'],
        language: 'en',
        isActive: true
    },

    {
        name: 'Subscription Canceled',
        slug: 'subscription-canceled',
        category: 'billing',
        subject: 'Subscription Canceled - TargetChat',
        htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9E9E9E; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Canceled</h1>
          </div>
          <div class="content">
            <h2>Hi {{username}},</h2>
            <p>Your {{plan}} subscription has been canceled.</p>
            <p>You will retain access until <strong>{{expiresAt}}</strong>.</p>
            <p>We're sorry to see you go! If you have a moment, we'd love to hear your feedback:</p>
            <p><a href="{{feedbackUrl}}" style="color: #667eea;">Share Feedback</a></p>
            <p>You can reactivate your subscription anytime from your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `,
        variables: ['username', 'plan', 'expiresAt', 'feedbackUrl'],
        language: 'en',
        isActive: true
    },

    {
        name: 'Workflow Completed',
        slug: 'workflow-complete',
        category: 'workflow',
        subject: '✅ Workflow "{{workflowName}}" completed',
        htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .success-badge { background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Workflow Completed!</h1>
          </div>
          <div class="content">
            <h2>Hi {{username}},</h2>
            <p>Your workflow <strong>"{{workflowName}}"</strong> has completed successfully!</p>
            <p><span class="success-badge">{{status}}</span></p>
            <p><strong>Completed at:</strong> {{completedAt}}</p>
            <p><strong>Duration:</strong> {{duration}}</p>
            <p><a href="{{resultUrl}}" style="color: #2196F3; font-weight: bold;">View Results →</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
        variables: ['username', 'workflowName', 'status', 'completedAt', 'resultUrl', 'duration'],
        language: 'en',
        isActive: true
    },

    {
        name: 'Workflow Failed',
        slug: 'workflow-failed',
        category: 'workflow',
        subject: '❌ Workflow "{{workflowName}}" failed',
        htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .error-box { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Workflow Failed</h1>
          </div>
          <div class="content">
            <h2>Hi {{username}},</h2>
            <p>Your workflow <strong>"{{workflowName}}"</strong> encountered an error and failed to complete.</p>
            <div class="error-box">
              <strong>Error:</strong><br>{{error}}
            </div>
            <p><strong>Failed at:</strong> {{failedAt}}</p>
            <p><a href="{{workflowUrl}}" style="color: #f44336; font-weight: bold;">View Workflow →</a></p>
            <p>Need help? <a href="{{supportUrl}}">Contact Support</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
        variables: ['username', 'workflowName', 'error', 'failedAt', 'supportUrl', 'workflowUrl'],
        language: 'en',
        isActive: true
    },

    {
        name: 'Admin Announcement',
        slug: 'admin-announcement',
        category: 'admin',
        subject: '{{title}}',
        htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 {{title}}</h1>
          </div>
          <div class="content">
            <h2>Hi {{username}},</h2>
            <div style="white-space: pre-line;">{{message}}</div>
            <center>
              <a href="{{ctaLink}}" class="button">{{ctaText}}</a>
            </center>
            <p><small>Date: {{date}}</small></p>
          </div>
        </div>
      </body>
      </html>
    `,
        variables: ['username', 'title', 'message', 'ctaLink', 'ctaText', 'date'],
        language: 'en',
        isActive: true
    }
];

async function seedTemplates() {
    try {
        console.log('📧 Seeding email templates...\n');

        for (const template of defaultTemplates) {
            const [instance, created] = await EmailTemplate.findOrCreate({
                where: { slug: template.slug },
                defaults: template
            });

            if (created) {
                console.log(`✅ Created: ${template.name} (${template.slug})`);
            } else {
                console.log(`⏭️  Exists: ${template.name} (${template.slug})`);
            }
        }

        console.log(`\n✅ Template seeding complete! ${defaultTemplates.length} templates processed.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Template seeding failed:', error.message);
        process.exit(1);
    }
}

seedTemplates();
