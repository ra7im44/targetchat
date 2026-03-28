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

        console.log('🔄 Updating workflows table...');

        const tableInfo = await queryInterface.describeTable('workflows');

        if (!tableInfo.user_id) {
            await queryInterface.addColumn('workflows', 'user_id', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                }
            });
            console.log('✅ user_id column added');
        }

        if (!tableInfo.is_public) {
            await queryInterface.addColumn('workflows', 'is_public', {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            });
            console.log('✅ is_public column added');
        }

        if (!tableInfo.webhook_url) {
            await queryInterface.addColumn('workflows', 'webhook_url', {
                type: DataTypes.STRING(500),
                allowNull: true // Allow null for now to avoid errors on existing rows
            });
            console.log('✅ webhook_url column added');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
