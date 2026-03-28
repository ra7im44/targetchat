require('dotenv').config();
const { Setting } = require('./src/models');

async function disableMaintenance() {
    try {
        console.log('⏳ Disabling Maintenance Mode...');

        const [setting, created] = await Setting.findOrCreate({
            where: { key: 'maintenance_mode' },
            defaults: { value: 'false', section: 'system' }
        });

        if (!created) {
            await setting.update({ value: 'false' });
        }

        console.log('✅ Maintenance Mode: DISABLED');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

disableMaintenance();
