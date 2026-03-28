const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize } = require('../src/models');

async function sync() {
    try {
        console.log('Authenticating...');
        await sequelize.authenticate();
        console.log('Database connection OK.');

        console.log('Syncing database (alter: true)...');
        await sequelize.sync({ alter: true });
        console.log('Database sync completed successfully.');

        process.exit(0);
    } catch (err) {
        console.error('Sync failed:', err);
        process.exit(1);
    }
}

sync();
