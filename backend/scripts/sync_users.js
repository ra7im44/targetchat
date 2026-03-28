const { sequelize, User } = require('../src/models');

async function syncTable() {
    try {
        console.log('Syncing User table schema...');
        await User.sync({ alter: true });
        console.log('User table synced successfully.');
    } catch (error) {
        console.error('Error syncing User table:', error);
    } finally {
        await sequelize.close();
    }
}

syncTable();
