require('dotenv').config({ path: '../backend/.env' }); // Adjust path if running from scripts dir
const { sequelize, BlockedIP } = require('../backend/src/models');

async function migrate() {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Connected.');

        console.log('📦 Syncing BlockedIP model...');
        await BlockedIP.sync({ force: false, alter: true }); // Use alter to be safe, or force: false
        console.log('✅ blocked_ips table created/updated successfully.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
