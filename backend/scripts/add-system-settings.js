require('dotenv').config();
const { Setting } = require('../src/models');

async function addSystemSettings() {
    try {
        console.log('🚀 Adding system settings...');

        const systemSettings = [
            { section: 'integrations', key: 'n8n_webhook_url', value: process.env.N8N_WEBHOOK_URL || '', type: 'string', description: 'n8n Webhook URL', isPublic: false },
            { section: 'integrations', key: 'ollama_api_key', value: process.env.OLLAMA_API_KEY || '', type: 'string', description: 'Ollama API Key', isPublic: false },
            { section: 'security', key: 'file_url_expire_seconds', value: process.env.FILE_URL_EXPIRE_SECONDS || '60', type: 'number', description: 'File URL Expiry (seconds)', isPublic: false }
        ];

        for (const s of systemSettings) {
            const [setting, created] = await Setting.findOrCreate({
                where: { key: s.key },
                defaults: s
            });

            if (!created) {
                console.log(`✅ Verified: ${s.key}`);
            } else {
                console.log(`✨ Created: ${s.key}`);
            }
        }

        console.log('🎉 Done!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

addSystemSettings();
