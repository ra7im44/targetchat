require('dotenv').config({ path: '../.env' });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'targetchatv1',
    'root',
    'root',
    {
        host: '127.0.0.1',
        dialect: 'mysql',
        logging: false
    }
);

async function checkSchema() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        const [msgCols] = await sequelize.query("SHOW COLUMNS FROM messages");
        const userIdCol = msgCols.find(c => c.Field === 'userId' || c.Field === 'user_id');
        console.log('Messages UserID Column:', userIdCol);

        const [chatCols] = await sequelize.query("SHOW COLUMNS FROM chats");
        const chatUserIdCol = chatCols.find(c => c.Field === 'userId' || c.Field === 'user_id');
        console.log('Chats UserID Column:', chatUserIdCol);

        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

checkSchema();
