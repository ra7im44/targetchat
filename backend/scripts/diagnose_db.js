require('dotenv').config({ path: '../.env' });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    'targetchatv1',
    'root',
    'root',
    {
        host: '127.0.0.1',
        dialect: 'mysql',
        logging: false
    }
);

async function diagnose() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Check Tables
        const [tables] = await sequelize.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Tables:', JSON.stringify(tableNames, null, 2));
        console.log('Widgets table exists:', tableNames.includes('widgets'));

        // Check Workflows Columns
        if (tableNames.includes('workflows')) {
            const [wCols] = await sequelize.query("SHOW COLUMNS FROM workflows");
            console.log('Workflow Columns:', JSON.stringify(wCols.map(c => c.Field), null, 2));
        }

        // Check ActivityLogs Columns
        if (tableNames.includes('activity_logs')) {
            const [aCols] = await sequelize.query("SHOW COLUMNS FROM activity_logs");
            console.log('ActivityLog Columns:', JSON.stringify(aCols.map(c => c.Field), null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
        process.exit(1);
    }
}

diagnose();
