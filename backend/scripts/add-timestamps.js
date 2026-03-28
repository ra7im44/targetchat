require('dotenv').config();
const mysql = require('mysql2/promise');

async function addTimestampColumns() {
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

        // Check table structure
        const [columns] = await connection.query(`DESCRIBE users`);
        console.log('📋 Current columns:', columns.map(c => c.Field).join(', '));

        // Add created_at if not exists
        const hasCreatedAt = columns.some(c => c.Field === 'created_at');
        if (!hasCreatedAt) {
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
            console.log('✅ Added created_at column');
        } else {
            console.log('⏭️  created_at already exists');
        }

        // Add updated_at if not exists
        const hasUpdatedAt = columns.some(c => c.Field === 'updated_at');
        if (!hasUpdatedAt) {
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
      `);
            console.log('✅ Added updated_at column');
        } else {
            console.log('⏭️  updated_at already exists');
        }

        console.log('✅ Migration completed!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

addTimestampColumns();
