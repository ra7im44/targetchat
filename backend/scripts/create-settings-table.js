require('dotenv').config();
const mysql = require('mysql2/promise');

async function createSettingsTable() {
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
        const [tables] = await connection.query(`SHOW TABLES LIKE 'settings'`);

        if (tables.length === 0) {
            console.log('📋 Creating settings table...');
            await connection.query(`
        CREATE TABLE settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          section VARCHAR(50) NOT NULL DEFAULT 'general',
          \`key\` VARCHAR(100) NOT NULL UNIQUE,
          value TEXT,
          type VARCHAR(20) DEFAULT 'string',
          description VARCHAR(255),
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);
            console.log('✅ Created settings table');

            // Insert default settings
            console.log('📥 Seeding default settings...');
            const defaultSettings = [
                ['general', 'app_name', 'TargetChat', 'string', 'Application Name', 1],
                ['general', 'allow_registration', 'true', 'boolean', 'Allow new user registration', 1],
                ['general', 'theme_primary_color', '#3B82F6', 'string', 'Primary Theme Color', 1],
                ['features', 'enable_file_upload', 'true', 'boolean', 'Enable File Uploads', 1],
                ['ai', 'default_model_provider', 'openai', 'string', 'Default AI Provider', 0],
                ['security', 'max_login_attempts', '5', 'number', 'Max Login Attempts', 0]
            ];

            for (const [section, key, value, type, desc, isPublic] of defaultSettings) {
                await connection.query(
                    `INSERT INTO settings (section, \`key\`, value, type, description, is_public) VALUES (?, ?, ?, ?, ?, ?)`,
                    [section, key, value, type, desc, isPublic]
                );
            }
            console.log('✅ Seeded default settings');
        } else {
            console.log('⏭️  settings table already exists');
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

createSettingsTable();
