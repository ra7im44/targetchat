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

async function addAvatarColumn() {
    try {
        await sequelize.authenticate();
        console.log('✓ Connected to database\n');

        // Check if avatar column exists
        const [columns] = await sequelize.query("SHOW COLUMNS FROM users;");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('avatar')) {
            console.log('Adding avatar column...');
            await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN avatar VARCHAR(255) NULL AFTER email;
      `);
            console.log('✅ Added avatar column');
        } else {
            console.log('⊘ Avatar column already exists');
        }

        console.log('\n✅ Migration complete!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

addAvatarColumn();
