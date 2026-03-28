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

async function removeStripeColumns() {
    try {
        await sequelize.authenticate();
        console.log('✓ Connected to database');

        // Check if columns exist first
        const [columns] = await sequelize.query("SHOW COLUMNS FROM users;");
        const columnNames = columns.map(c => c.Field);

        const columnsToRemove = ['stripe_customer_id', 'subscription_status', 'subscription_plan'];

        for (const column of columnsToRemove) {
            if (columnNames.includes(column)) {
                console.log(`Dropping column: ${column}...`);
                await sequelize.query(`ALTER TABLE users DROP COLUMN ${column};`);
                console.log(`✓ Dropped ${column}`);
            } else {
                console.log(`⊘ Column ${column} does not exist, skipping`);
            }
        }

        console.log('\n✓ Migration completed successfully!');
    } catch (err) {
        console.error('✗ Migration error:', err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

removeStripeColumns();
