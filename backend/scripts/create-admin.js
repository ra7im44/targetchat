require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createAdminUser() {
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

        // First, check table structure
        const [columns] = await connection.query(`DESCRIBE users`);
        console.log('📋 Users table columns:', columns.map(c => c.Field).join(', '));

        // Check if admin already exists
        const [existingAdmins] = await connection.query(
            `SELECT * FROM users WHERE role = 'admin' LIMIT 1`
        );

        if (existingAdmins.length > 0) {
            console.log('⏭️  Admin user already exists:', existingAdmins[0].email);
            await connection.end();
            process.exit(0);
        }

        // Create admin user (try both column name formats)
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Check if createdAt or created_at exists
        const hasCreatedAt = columns.some(c => c.Field === 'createdAt');
        const hasCreated_at = columns.some(c => c.Field === 'created_at');

        let query;
        if (hasCreatedAt) {
            query = `INSERT INTO users (name, email, password, role, is_active, createdAt, updatedAt)
               VALUES (?, ?, ?, 'admin', true, NOW(), NOW())`;
        } else if (hasCreated_at) {
            query = `INSERT INTO users (name, email, password, role, is_active, created_at, updated_at)
               VALUES (?, ?, ?, 'admin', true, NOW(), NOW())`;
        } else {
            query = `INSERT INTO users (name, email, password, role, is_active)
               VALUES (?, ?, ?, 'admin', true)`;
        }

        await connection.query(query, ['Admin', 'admin@targetchat.com', hashedPassword]);

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@targetchat.com');
        console.log('🔑 Password: admin123');
        console.log('⚠️  Please change the password after first login!');

        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

createAdminUser();
