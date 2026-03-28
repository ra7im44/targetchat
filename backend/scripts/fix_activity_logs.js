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
        console.log('Connected. Analyzing activity_logs columns...');

        const [cols] = await sequelize.query("SHOW COLUMNS FROM activity_logs;");
        const colNames = cols.map(c => c.Field);
        console.log('Current columns:', colNames);

        const hasCamelCreated = colNames.includes('createdAt');
        const hasSnakeCreated = colNames.includes('created_at');

        // Fix CreatedAt
        if (hasCamelCreated && hasSnakeCreated) {
            console.log('Both createdAt and created_at exist. Dropping createdAt...');
            await sequelize.query("ALTER TABLE activity_logs DROP COLUMN createdAt;");
        } else if (hasCamelCreated && !hasSnakeCreated) {
            console.log('Only createdAt exists. Renaming to created_at...');
            await sequelize.query("ALTER TABLE activity_logs CHANGE createdAt created_at DATETIME;");
        } else if (!hasCamelCreated && !hasSnakeCreated) {
            console.log('No created_at column found. Creating it...');
            await sequelize.query("ALTER TABLE activity_logs ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;");
        }

        // Ensure Default Value
        console.log('Applying default values...');
        await sequelize.query("ALTER TABLE activity_logs MODIFY COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP;");

        console.log('Done.');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await sequelize.close();
    }
}

run();
