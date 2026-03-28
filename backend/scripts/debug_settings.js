require('dotenv').config();
const { Setting } = require('../src/models');

async function debug() {
    try {
        const counts = await Setting.count();
        console.log('Total settings count:', counts);

        const settings = await Setting.findAll();
        console.log('Fetched settings:', settings.length);

        const grouped = settings.reduce((acc, setting) => {
            if (!acc[setting.section]) {
                acc[setting.section] = [];
            }
            acc[setting.section].push(setting.key);
            return acc;
        }, {});

        console.log('Grouped keys:', JSON.stringify(grouped, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Debug failed:', err);
        process.exit(1);
    }
}

debug();
