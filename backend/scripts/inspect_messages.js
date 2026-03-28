const { Sequelize } = require('sequelize');
require('dotenv').config({ path: __dirname + '/../.env' });

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false
    }
);

async function run() {
    try {
        await sequelize.authenticate();
        console.log('--- COLUMNS START ---');
        const [results] = await sequelize.query("SHOW COLUMNS FROM messages;");
        results.forEach(col => {
            console.log(`${col.Field} | ${col.Type} | ${col.Null} | ${col.Default}`);
        });
        console.log('--- COLUMNS END ---');
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

run();
