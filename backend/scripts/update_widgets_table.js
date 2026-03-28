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

        console.log('🔄 Updating widgets table...');

        const tableInfo = await queryInterface.describeTable('widgets');

        if (!tableInfo.slug) {
            await queryInterface.addColumn('widgets', 'slug', {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            });
            console.log('✅ slug column added');
        }

        if (!tableInfo.public_key) {
            await queryInterface.addColumn('widgets', 'public_key', {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            });
            console.log('✅ public_key column added');
        }

        if (!tableInfo.secret_key) {
            await queryInterface.addColumn('widgets', 'secret_key', {
                type: DataTypes.STRING,
                allowNull: false
            });
            console.log('✅ secret_key column added');
        }

        if (!tableInfo.theme) {
            await queryInterface.addColumn('widgets', 'theme', {
                type: DataTypes.JSON,
                allowNull: false
            });
            console.log('✅ theme column added');
        }

        if (!tableInfo.triggers) {
            await queryInterface.addColumn('widgets', 'triggers', {
                type: DataTypes.JSON,
                allowNull: false
            });
            console.log('✅ triggers column added');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
