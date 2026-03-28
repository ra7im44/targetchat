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
        console.log('Connected. analyzing columns...');

        const [cols] = await sequelize.query("SHOW COLUMNS FROM messages;");
        const colNames = cols.map(c => c.Field);
        console.log('Current columns:', colNames);

        const hasCamelCreated = colNames.includes('createdAt');
        const hasSnakeCreated = colNames.includes('created_at');
        const hasCamelUpdated = colNames.includes('updatedAt');
        const hasSnakeUpdated = colNames.includes('updated_at');

        // Fix CreatedAt
        if (hasCamelCreated && hasSnakeCreated) {
            console.log('Both createdAt and created_at exist. Dropping createdAt...');
            await sequelize.query("ALTER TABLE messages DROP COLUMN createdAt;");
        } else if (hasCamelCreated && !hasSnakeCreated) {
            console.log('Only createdAt exists. Renaming to created_at...');
            await sequelize.query("ALTER TABLE messages CHANGE createdAt created_at DATETIME;");
        }

        // Fix UpdatedAt
        if (hasCamelUpdated && hasSnakeUpdated) {
            console.log('Both updatedAt and updated_at exist. Dropping updatedAt...');
            await sequelize.query("ALTER TABLE messages DROP COLUMN updatedAt;");
        } else if (hasCamelUpdated && !hasSnakeUpdated) {
            console.log('Only updatedAt exists. Renaming to updated_at...');
            await sequelize.query("ALTER TABLE messages CHANGE updatedAt updated_at DATETIME;");
        }

        // Ensure Defaults
        console.log('Applying default values...');
        await sequelize.query("ALTER TABLE messages MODIFY COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP;");
        await sequelize.query("ALTER TABLE messages MODIFY COLUMN updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;");

        console.log('Done.');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await sequelize.close();
    }
}

run();
