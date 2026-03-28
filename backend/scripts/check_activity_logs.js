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

async function checkLogs() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        const [results] = await sequelize.query("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5");
        console.log(`Found ${results.length} logs.`);
        if (results.length > 0) {
            console.log('Last log:', results[0]);
        } else {
            console.log('⚠️ No activity logs found. You might need to perform some actions (login, create widget) to generate logs.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

checkLogs();
