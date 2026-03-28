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

        console.log('🔄 Checking widgets table for workflow_id...');
        const tableInfo = await queryInterface.describeTable('widgets');

        if (!tableInfo.workflow_id) {
            await queryInterface.addColumn('widgets', 'workflow_id', {
                type: DataTypes.UUID, // Assuming Workflow ID is UUID based on previous checks
                allowNull: true,
                references: {
                    model: 'workflows',
                    key: 'id'
                },
                onDelete: 'SET NULL'
            });
            console.log('✅ workflow_id column added to widgets');
        } else {
            console.log('ℹ️ workflow_id column already exists in widgets');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
