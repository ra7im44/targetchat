const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'targetchat',
        multipleStatements: true
    });

    try {
        console.log('Running migration: add_workspace_to_workflows.sql');

        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(path.join(__dirname, 'add_workspace_to_workflows.sql'), 'utf8');

        await connection.query(sql);

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

runMigration().catch(console.error);
