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

        const [rows] = await sequelize.query("SELECT * FROM workflows");
        console.log(`Found ${rows.length} workflows:`);
        rows.forEach(w => {
            console.log(`- [${w.id}] ${w.name} (User: ${w.user_id}, Public: ${w.is_public}, Active: ${w.is_active})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

check();
