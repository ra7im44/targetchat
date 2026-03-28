require('dotenv').config();
const { sequelize } = require('../src/models');

async function syncDatabase() {
    try {
        console.log('🔌 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected');

        console.log('🔄 Syncing database with alter: true...');
        await sequelize.sync({ alter: true });

        console.log('✅ Database sync completed successfully!');
        await sequelize.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during sync:', err);
        process.exit(1);
    }
}

syncDatabase();
