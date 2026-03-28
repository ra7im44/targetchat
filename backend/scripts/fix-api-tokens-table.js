require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixApiTokensTable() {
    let connection;
    try {
        console.log('🔌 Connecting to MySQL...');

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || 'root',
            database: process.env.DB_NAME || 'targetchatv1'
        });

        console.log('✅ Database connected');

        // Alter table to increase token_prefix size
        console.log('🔨 Altering api_tokens table...');
        await connection.query(`ALTER TABLE api_tokens MODIFY COLUMN token_prefix VARCHAR(30) NOT NULL`);

        console.log('✅ Altered token_prefix to VARCHAR(30)');

        console.log('\n✅ Fix completed!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

fixApiTokensTable();
