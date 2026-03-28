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

const queryInterface = sequelize.getQueryInterface();

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        console.log('🔄 Adding user_id to workflows table...');

        // Check if column exists first
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
        } else {
            console.log('⚠️ user_id column already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
