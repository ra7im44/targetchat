require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function createApiTokensTable() {
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

        // Check if table exists
        const [tables] = await connection.query(`SHOW TABLES LIKE 'api_tokens'`);

        if (tables.length === 0) {
            console.log('📋 Creating api_tokens table...');
            await connection.query(`
        CREATE TABLE api_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          token_hash VARCHAR(255) NOT NULL UNIQUE,
          token_prefix VARCHAR(10) NOT NULL,
          permissions JSON,
          expires_at TIMESTAMP NULL,
          last_used_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
            console.log('✅ Created api_tokens table');
        } else {
            console.log('⏭️  api_tokens table already exists');
        }

        console.log('\n✅ Migration completed!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

createApiTokensTable();
