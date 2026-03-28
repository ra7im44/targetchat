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

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        const [columns] = await sequelize.query("SHOW COLUMNS FROM messages");
        console.log('Messages Table Columns:');
        console.table(columns);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

check();
