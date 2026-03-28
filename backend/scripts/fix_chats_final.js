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

async function fixChatsTableFinal() {
    try {
        await sequelize.authenticate();
        console.log('✓ Connected\n');

        // Check if createdAt column exists (camelCase)
        const [result] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'chats' 
      AND COLUMN_NAME = 'createdAt';
    `);

        if (result.length > 0) {
            console.log('❌ Found createdAt column (camelCase) - this is the problem!');
            console.log('Dropping it and recreating with correct name...\n');

            // Drop the bad column
            await sequelize.query(`ALTER TABLE chats DROP COLUMN createdAt;`);
            console.log('✓ Dropped createdAt');

            // Add created_at with correct default
            await sequelize.query(`
        ALTER TABLE chats 
        ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP 
        AFTER userId;
      `);
            console.log('✓ Added created_at with DEFAULT CURRENT_TIMESTAMP');
        } else {
            console.log('✓ No createdAt column found');
        }

        // Check if updatedAt column exists (camelCase)
        const [result2] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'chats' 
      AND COLUMN_NAME = 'updatedAt';
    `);

        if (result2.length > 0) {
            console.log('❌ Found updatedAt column (camelCase) - this is the problem!');
            console.log('Dropping it and recreating with correct name...\n');

            // Drop the bad column
            await sequelize.query(`ALTER TABLE chats DROP COLUMN updatedAt;`);
            console.log('✓ Dropped updatedAt');

            // Add updated_at with correct default
            await sequelize.query(`
        ALTER TABLE chats 
        ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
        AFTER created_at;
      `);
            console.log('✓ Added updated_at with DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
        } else {
            console.log('✓ No updatedAt column found');
        }

        // Show final schema
        console.log('\n' + '='.repeat(60));
        const [columns] = await sequelize.query("SHOW COLUMNS FROM chats;");
        console.log('FINAL SCHEMA:');
        columns.forEach(col => {
            console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Default || 'NULL'} | ${col.Extra || ''}`);
        });
        console.log('='.repeat(60));

        console.log('\n✅ Done! Restart your backend server.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

fixChatsTableFinal();
