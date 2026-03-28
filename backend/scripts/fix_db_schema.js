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

        // 1. Fix Widgets Table
        console.log('🔄 Checking widgets table...');
        const tables = await queryInterface.showAllTables();

        if (!tables.includes('widgets')) {
            console.log('⚠️ Widgets table missing. Creating...');
            await queryInterface.createTable('widgets', {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true
                },
                user_id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: { model: 'users', key: 'id' },
                    onDelete: 'CASCADE'
                },
                workspace_id: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    references: { model: 'workspaces', key: 'id' },
                    onDelete: 'SET NULL'
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    defaultValue: 'My Website Widget'
                },
                slug: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true
                },
                status: {
                    type: DataTypes.ENUM('active', 'inactive'),
                    defaultValue: 'active'
                },
                public_key: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true
                },
                secret_key: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                theme: {
                    type: DataTypes.JSON,
                    allowNull: false
                },
                triggers: {
                    type: DataTypes.JSON,
                    allowNull: false
                },
                settings: {
                    type: DataTypes.JSON,
                    allowNull: false
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false
                }
            });
            console.log('✅ Widgets table created');
        } else {
            console.log('✅ Widgets table exists');
        }

        // 2. Fix Workflows Table
        console.log('🔄 Checking workflows table...');
        const workflowCols = await queryInterface.describeTable('workflows');

        if (!workflowCols.user_id) {
            await queryInterface.addColumn('workflows', 'user_id', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: 'users', key: 'id' }
            });
            console.log('✅ workflows.user_id added');
        }

        if (!workflowCols.is_public) {
            await queryInterface.addColumn('workflows', 'is_public', {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            });
            console.log('✅ workflows.is_public added');
        }

        // 3. Fix Activity Logs Table
        console.log('🔄 Checking activity_logs table...');
        const activityCols = await queryInterface.describeTable('activity_logs');

        if (!activityCols.entity_type) {
            await queryInterface.addColumn('activity_logs', 'entity_type', {
                type: DataTypes.STRING,
                allowNull: true
            });
            console.log('✅ activity_logs.entity_type added');
        }

        if (!activityCols.entity_id) {
            await queryInterface.addColumn('activity_logs', 'entity_id', {
                type: DataTypes.STRING,
                allowNull: true
            });
            console.log('✅ activity_logs.entity_id added');
        }

        if (!activityCols.metadata) {
            await queryInterface.addColumn('activity_logs', 'metadata', {
                type: DataTypes.JSON,
                allowNull: true
            });
            console.log('✅ activity_logs.metadata added');
        }

        if (!activityCols.ip_address) {
            await queryInterface.addColumn('activity_logs', 'ip_address', {
                type: DataTypes.STRING,
                allowNull: true
            });
            console.log('✅ activity_logs.ip_address added');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
