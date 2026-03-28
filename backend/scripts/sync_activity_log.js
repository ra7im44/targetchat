const { sequelize, ActivityLog } = require('../src/models');

async function syncTable() {
    try {
        console.log('Syncing ActivityLog table...');
        await ActivityLog.sync({ alter: true });
        console.log('ActivityLog table synced successfully.');
    } catch (error) {
        console.error('Error syncing ActivityLog table:', error);
    } finally {
        await sequelize.close();
    }
}

syncTable();
