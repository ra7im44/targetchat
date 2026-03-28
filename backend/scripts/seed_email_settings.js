require('dotenv').config();
const { Setting } = require('../src/models');

async function seedEmailSettings() {
    try {
        console.log('📧 Seeding Email Settings...\n');

        const emailSettings = [
            // Email Provider Section
            {
                section: 'email',
                key: 'email_provider',
                value: process.env.EMAIL_PROVIDER || 'smtp',
                type: 'select',
                description: 'Email service provider (smtp, sendgrid, ses)',
                isPublic: false
            },

            // SMTP Settings
            {
                section: 'email',
                key: 'smtp_host',
                value: process.env.SMTP_HOST || 'smtp.gmail.com',
                type: 'text',
                description: 'SMTP server hostname',
                isPublic: false
            },
            {
                section: 'email',
                key: 'smtp_port',
                value: process.env.SMTP_PORT || '587',
                type: 'number',
                description: 'SMTP server port',
                isPublic: false
            },
            {
                section: 'email',
                key: 'smtp_secure',
                value: process.env.SMTP_SECURE || 'false',
                type: 'boolean',
                description: 'Use TLS/SSL for SMTP',
                isPublic: false
            },
            {
                section: 'email',
                key: 'smtp_user',
                value: process.env.SMTP_USER || '',
                type: 'text',
                description: 'SMTP username/email',
                isPublic: false
            },
            {
                section: 'email',
                key: 'smtp_pass',
                value: process.env.SMTP_PASS || '',
                type: 'password',
                description: 'SMTP password',
                isPublic: false
            },

            // SendGrid Settings
            {
                section: 'email',
                key: 'sendgrid_api_key',
                value: process.env.SENDGRID_API_KEY || '',
                type: 'password',
                description: 'SendGrid API Key',
                isPublic: false
            },

            // AWS SES Settings
            {
                section: 'email',
                key: 'aws_ses_region',
                value: process.env.AWS_SES_REGION || 'us-east-1',
                type: 'text',
                description: 'AWS SES Region',
                isPublic: false
            },
            {
                section: 'email',
                key: 'aws_ses_access_key',
                value: process.env.AWS_SES_ACCESS_KEY || '',
                type: 'password',
                description: 'AWS SES Access Key',
                isPublic: false
            },
            {
                section: 'email',
                key: 'aws_ses_secret_key',
                value: process.env.AWS_SES_SECRET_KEY || '',
                type: 'password',
                description: 'AWS SES Secret Key',
                isPublic: false
            },

            // Sender Addresses
            {
                section: 'email',
                key: 'email_from_noreply',
                value: process.env.EMAIL_FROM_NOREPLY || 'no-reply@targetchat.com',
                type: 'email',
                description: 'No-reply sender address',
                isPublic: false
            },
            {
                section: 'email',
                key: 'email_from_system',
                value: process.env.EMAIL_FROM_SYSTEM || 'system@targetchat.com',
                type: 'email',
                description: 'System sender address',
                isPublic: false
            },
            {
                section: 'email',
                key: 'email_from_billing',
                value: process.env.EMAIL_FROM_BILLING || 'billing@targetchat.com',
                type: 'email',
                description: 'Billing sender address',
                isPublic: false
            },
            {
                section: 'email',
                key: 'email_from_workflows',
                value: process.env.EMAIL_FROM_WORKFLOWS || 'workflows@targetchat.com',
                type: 'email',
                description: 'Workflows sender address',
                isPublic: false
            },

            // Email Features
            {
                section: 'email',
                key: 'enable_registration_email',
                value: 'true',
                type: 'boolean',
                description: 'Send welcome email on user registration',
                isPublic: false
            },
            {
                section: 'email',
                key: 'enable_verification_email',
                value: 'true',
                type: 'boolean',
                description: 'Send email verification link',
                isPublic: false
            },
            {
                section: 'email',
                key: 'enable_password_reset_email',
                value: 'true',
                type: 'boolean',
                description: 'Send password reset emails',
                isPublic: false
            },
            {
                section: 'email',
                key: 'enable_billing_emails',
                value: 'true',
                type: 'boolean',
                description: 'Send billing and payment emails',
                isPublic: false
            },
            {
                section: 'email',
                key: 'enable_workflow_emails',
                value: 'true',
                type: 'boolean',
                description: 'Send workflow completion/failure emails',
                isPublic: false
            },
            {
                section: 'email',
                key: 'enable_admin_emails',
                value: 'true',
                type: 'boolean',
                description: 'Send admin announcement emails',
                isPublic: false
            },

            // Redis Settings
            {
                section: 'email',
                key: 'redis_host',
                value: process.env.REDIS_HOST || 'localhost',
                type: 'text',
                description: 'Redis host for email queue',
                isPublic: false
            },
            {
                section: 'email',
                key: 'redis_port',
                value: process.env.REDIS_PORT || '6379',
                type: 'number',
                description: 'Redis port',
                isPublic: false
            },
            {
                section: 'email',
                key: 'redis_password',
                value: process.env.REDIS_PASSWORD || '',
                type: 'password',
                description: 'Redis password (optional)',
                isPublic: false
            }
        ];

        for (const setting of emailSettings) {
            const [instance, created] = await Setting.findOrCreate({
                where: { key: setting.key },
                defaults: setting
            });

            if (created) {
                console.log(`✅ Created: ${setting.key}`);
            } else {
                console.log(`⏭️  Exists: ${setting.key}`);
            }
        }

        console.log(`\n✅ Email settings seeded! ${emailSettings.length} settings processed.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

seedEmailSettings();
