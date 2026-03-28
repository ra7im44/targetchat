require('dotenv').config();
const mysql = require('mysql2/promise');

async function addTimestampsToAllTables() {
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

        // Add timestamps to chats table
        console.log('\n📋 Checking chats table...');
        const [chatColumns] = await connection.query(`DESCRIBE chats`);

        const chatHasCreatedAt = chatColumns.some(c => c.Field === 'created_at');
        const chatHasUpdatedAt = chatColumns.some(c => c.Field === 'updated_at');

        if (!chatHasCreatedAt) {
            await connection.query(`
        ALTER TABLE chats 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
            console.log('✅ Added created_at to chats');
        } else {
            console.log('⏭️  chats.created_at already exists');
        }

        if (!chatHasUpdatedAt) {
            await connection.query(`
        ALTER TABLE chats 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
      `);
            console.log('✅ Added updated_at to chats');
        } else {
            console.log('⏭️  chats.updated_at already exists');
        }

        // Add timestamps to messages table
        console.log('\n📋 Checking messages table...');
        const [msgColumns] = await connection.query(`DESCRIBE messages`);

        const msgHasCreatedAt = msgColumns.some(c => c.Field === 'created_at');
        const msgHasUpdatedAt = msgColumns.some(c => c.Field === 'updated_at');

        if (!msgHasCreatedAt) {
            await connection.query(`
        ALTER TABLE messages 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
            console.log('✅ Added created_at to messages');
        } else {
            console.log('⏭️  messages.created_at already exists');
        }

        if (!msgHasUpdatedAt) {
            await connection.query(`
        ALTER TABLE messages 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
      `);
            console.log('✅ Added updated_at to messages');
        } else {
            console.log('⏭️  messages.updated_at already exists');
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

addTimestampsToAllTables();
