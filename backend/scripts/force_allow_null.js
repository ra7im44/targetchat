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

        // 1. Fix Messages Table
        const [msgCols] = await sequelize.query("SHOW COLUMNS FROM messages");
        const msgUserId = msgCols.find(c => c.Field === 'userId' || c.Field === 'user_id');

        if (msgUserId) {
            console.log(`Found message column: ${msgUserId.Field} (Null: ${msgUserId.Null})`);
            console.log(`🔄 Altering messages.${msgUserId.Field} to allow NULL...`);

            // Use raw query to be safe and explicit
            await sequelize.query(`ALTER TABLE messages MODIFY COLUMN ${msgUserId.Field} INT NULL`);
            console.log('✅ Messages table updated.');
        } else {
            console.error('❌ Could not find userId column in messages table!');
        }

        // 2. Fix Chats Table
        const [chatCols] = await sequelize.query("SHOW COLUMNS FROM chats");
        const chatUserId = chatCols.find(c => c.Field === 'userId' || c.Field === 'user_id');

        if (chatUserId) {
            console.log(`Found chat column: ${chatUserId.Field} (Null: ${chatUserId.Null})`);
            console.log(`🔄 Altering chats.${chatUserId.Field} to allow NULL...`);

            await sequelize.query(`ALTER TABLE chats MODIFY COLUMN ${chatUserId.Field} INT NULL`);
            console.log('✅ Chats table updated.');
        } else {
            console.error('❌ Could not find userId column in chats table!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
