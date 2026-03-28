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

async function inspectChats() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database\n');

        const [columns] = await sequelize.query("SHOW COLUMNS FROM chats;");

        console.log('CHATS TABLE SCHEMA:');
        console.log('='.repeat(80));
        columns.forEach(col => {
            console.log(`Field: ${col.Field}`);
            console.log(`  Type: ${col.Type}`);
            console.log(`  Null: ${col.Null}`);
            console.log(`  Key: ${col.Key}`);
            console.log(`  Default: ${col.Default || 'NULL'}`);
            console.log(`  Extra: ${col.Extra || 'none'}`);
            console.log('-'.repeat(80));
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

inspectChats();
