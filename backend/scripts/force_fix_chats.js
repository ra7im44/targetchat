const { Sequelize } = require('sequelize');
require('dotenv').config({ path: __dirname + '/../.env' });

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: console.log
    }
);

async function forceFixChats() {
    try {
        await sequelize.authenticate();
        console.log('Connected\n');

        // Get all column names
        const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'chats';
    `);

        const columnNames = cols.map(c => c.COLUMN_NAME);
        console.log('Current columns:', columnNames);

        // Drop ALL timestamp columns (both camelCase and snake_case)
        const timestampCols = ['createdAt', 'updatedAt', 'created_at', 'updated_at'];
        for (const col of timestampCols) {
            if (columnNames.includes(col)) {
                console.log(`Dropping ${col}...`);
                await sequelize.query(`ALTER TABLE chats DROP COLUMN \`${col}\`;`);
            }
        }

        // Add fresh columns with correct names and defaults
        console.log('\nAdding created_at...');
        await sequelize.query(`
      ALTER TABLE chats 
      ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

        console.log('Adding updated_at...');
        await sequelize.query(`
      ALTER TABLE chats 
      ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
    `);

        console.log('\n✅ DONE! Restart backend now.');

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await sequelize.close();
    }
}

forceFixChats();
