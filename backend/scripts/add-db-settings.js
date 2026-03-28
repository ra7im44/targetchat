require('dotenv').config();
const { Setting } = require('../src/models');

async function addDatabaseSettings() {
    try {
        console.log('🚀 Adding database settings...');

        const dbSettings = [
            { section: 'database', key: 'db_host', value: process.env.DB_HOST || '127.0.0.1', type: 'string', description: 'Database Host', isPublic: false },
            { section: 'database', key: 'db_port', value: process.env.DB_PORT || '3306', type: 'number', description: 'Database Port', isPublic: false },
            { section: 'database', key: 'db_name', value: process.env.DB_NAME || 'targetchatv1', type: 'string', description: 'Database Name', isPublic: false },
            { section: 'database', key: 'db_user', value: process.env.DB_USER || 'root', type: 'string', description: 'Database User', isPublic: false },
            { section: 'database', key: 'db_pass', value: process.env.DB_PASS || '', type: 'password', description: 'Database Password', isPublic: false }
        ];

        for (const s of dbSettings) {
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

addDatabaseSettings();
