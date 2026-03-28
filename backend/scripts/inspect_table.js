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
        console.log('Connected.');
        const [results] = await sequelize.query("DESCRIBE messages;");
        console.log(results);
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

run();
