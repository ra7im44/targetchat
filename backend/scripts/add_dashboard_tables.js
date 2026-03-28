require('dotenv').config({ path: '../.env' });
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'targetchatv1',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: console.log
    }
);

const ActivityLog = require('../src/models/ActivityLog')(sequelize, DataTypes);
const ApiToken = require('../src/models/ApiToken')(sequelize, DataTypes);

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        console.log('🔄 Syncing ActivityLog table...');
        await ActivityLog.sync({ alter: true });
        console.log('✅ ActivityLog table synced');

        console.log('🔄 Syncing ApiToken table...');
        await ApiToken.sync({ alter: true });
        console.log('✅ ApiToken table synced');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
