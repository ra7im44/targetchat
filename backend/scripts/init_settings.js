require('dotenv').config();
const { Setting } = require('../src/models');

const defaultSettings = [
    { key: 'app_name', value: 'TargetChat', section: 'general', isPublic: true },
    { key: 'logo_url', value: '/logo.svg', section: 'general', isPublic: true },
    { key: 'brand_color', value: '#4f46e5', section: 'general', isPublic: true },
    { key: 'payments_enabled', value: 'true', section: 'billing', isPublic: true },
    { key: 'maintenance_mode', value: 'false', section: 'system', isPublic: true }
];

async function initSettings() {
    try {
        console.log('🚀 Initializing Public Settings...');

        for (const s of defaultSettings) {
            const [setting, created] = await Setting.findOrCreate({
                where: { key: s.key },
                defaults: s
            });

            if (!created) {
                // Update to ensures isPublic is true even if they existed
                await setting.update({ isPublic: true });
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

initSettings();
