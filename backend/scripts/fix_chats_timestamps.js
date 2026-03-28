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

async function fixChatsTable() {
    try {
        await sequelize.authenticate();
        console.log('✓ Connected to database');

        // Check current columns
        const [columns] = await sequelize.query("SHOW COLUMNS FROM chats;");
        console.log('\nCurrent columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });

        const columnNames = columns.map(c => c.Field);

        // Fix created_at
        if (columnNames.includes('created_at')) {
            console.log('\n✓ Column created_at exists');

            // Check if it has the right default
            const createdAtCol = columns.find(c => c.Field === 'created_at');
            if (!createdAtCol.Default || !createdAtCol.Default.includes('CURRENT_TIMESTAMP')) {
                console.log('Fixing created_at default value...');
                await sequelize.query(`
          ALTER TABLE chats 
          MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
        `);
                console.log('✓ Fixed created_at');
            } else {
                console.log('⊘ created_at already has correct default');
            }
        } else if (columnNames.includes('createdAt')) {
            console.log('\nRenaming createdAt to created_at...');
            await sequelize.query(`ALTER TABLE chats CHANGE createdAt created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
            console.log('✓ Renamed createdAt to created_at');
        }

        // Fix updated_at
        if (columnNames.includes('updated_at')) {
            console.log('\n✓ Column updated_at exists');

            const updatedAtCol = columns.find(c => c.Field === 'updated_at');
            if (!updatedAtCol.Extra || !updatedAtCol.Extra.includes('on update CURRENT_TIMESTAMP')) {
                console.log('Fixing updated_at default value...');
                await sequelize.query(`
          ALTER TABLE chats 
          MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
        `);
                console.log('✓ Fixed updated_at');
            } else {
                console.log('⊘ updated_at already has correct default');
            }
        } else if (columnNames.includes('updatedAt')) {
            console.log('\nRenaming updatedAt to updated_at...');
            await sequelize.query(`ALTER TABLE chats CHANGE updatedAt updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;`);
            console.log('✓ Renamed updatedAt to updated_at');
        }

        console.log('\n✓ Migration completed successfully!');

        // Show final schema
        const [finalColumns] = await sequelize.query("SHOW COLUMNS FROM chats;");
        console.log('\nFinal schema:');
        finalColumns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''} ${col.Extra || ''}`);
        });

    } catch (err) {
        console.error('✗ Migration error:', err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

fixChatsTable();
