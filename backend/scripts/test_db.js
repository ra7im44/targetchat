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

async function testTable() {
    try {
        await sequelize.authenticate();

        const [tables] = await sequelize.query("SHOW TABLES LIKE 'workflow_users';");

        if (tables.length > 0) {
            console.log('✅ SUCCESS: workflow_users table EXISTS!');

            const [columns] = await sequelize.query("SHOW COLUMNS FROM workflow_users;");
            console.log('\nColumns:');
            columns.forEach(col => console.log(`  - ${col.Field}`));
        } else {
            console.log('❌ FAIL: workflow_users table does NOT exist!');
        }

        const [workflowCols] = await sequelize.query("SHOW COLUMNS FROM workflows;");
        const hasIsPublic = workflowCols.some(col => col.Field === 'is_public');

        if (hasIsPublic) {
            console.log('\n✅ SUCCESS: is_public column EXISTS in workflows!');
        } else {
            console.log('\n❌ FAIL: is_public column does NOT exist in workflows!');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

testTable();
