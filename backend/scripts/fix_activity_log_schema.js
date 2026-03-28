require('dotenv').config({ path: '../.env' });
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
    'targetchatv1',
    'root',
    'root',
    {
        host: '127.0.0.1',
        dialect: 'mysql',
        logging: console.log
    }
);

const queryInterface = sequelize.getQueryInterface();

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        console.log('🔄 Checking activity_logs table...');
        const tableInfo = await queryInterface.describeTable('activity_logs');

        if (!tableInfo.updated_at) {
            await queryInterface.addColumn('activity_logs', 'updated_at', {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            });
            console.log('✅ updated_at column added to activity_logs');
        } else {
            console.log('ℹ️ updated_at column already exists in activity_logs');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
