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

        // Modify chats table
        console.log('🔄 Modifying chats.userId to allow NULL...');
        await queryInterface.changeColumn('chats', 'userId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' }
        });

        // Modify messages table
        console.log('🔄 Modifying messages.userId to allow NULL...');
        await queryInterface.changeColumn('messages', 'userId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' }
        });

        console.log('✅ Migration complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
