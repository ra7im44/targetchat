require('dotenv').config();
const { Setting, sequelize } = require('../src/models');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database.');

        const settings = [
            // Meta Settings
            { key: 'FACEBOOK_APP_ID', value: process.env.FACEBOOK_APP_ID, section: 'meta', description: 'Meta/Facebook Application ID' },
            { key: 'FACEBOOK_APP_SECRET', value: process.env.FACEBOOK_APP_SECRET, section: 'meta', description: 'Meta/Facebook Application Secret' },
            { key: 'META_VERIFY_TOKEN', value: process.env.META_VERIFY_TOKEN, section: 'meta', description: 'Webhook Verification Token' },
            { key: 'BACKEND_URL', value: process.env.BACKEND_URL, section: 'general', description: 'Public URL of your backend instance' },

            // AI / Workflow Settings
            { key: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY, section: 'ai', description: 'OpenAI API Key for default AI responses' },
            { key: 'N8N_WEBHOOK_URL', value: process.env.N8N_WEBHOOK_URL, section: 'ai', description: 'Default n8n webhook for automated workflows' },

            // Email Settings
            { key: 'email_provider', value: process.env.EMAIL_PROVIDER || 'smtp', section: 'email', description: 'Email provider type (smtp, sendgrid, ses)' },
            { key: 'smtp_host', value: process.env.SMTP_HOST, section: 'email' },
            { key: 'smtp_port', value: process.env.SMTP_PORT, section: 'email' },
            { key: 'smtp_user', value: process.env.SMTP_USER, section: 'email' },
            { key: 'smtp_pass', value: process.env.SMTP_PASS, section: 'email' },
            { key: 'EMAIL_FROM_SYSTEM', value: process.env.EMAIL_FROM_SYSTEM || 'system@yourdomain.com', section: 'email' }
        ];

        console.log('🚀 Migrating .env settings to Database...');

        for (const s of settings) {
            if (s.value) {
                await Setting.upsert({
                    ...s,
                    type: 'string',
                    isPublic: false
                });
                console.log(`  ✅ Migrated: ${s.key}`);
            } else {
                console.log(`  ℹ️  Skipped (no value in .env): ${s.key}`);
            }
        }

        console.log('\n✨ Migration complete! You can now edit these settings in the Admin Dashboard.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
