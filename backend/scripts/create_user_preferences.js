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

async function createUserPreferencesTable() {
    try {
        await sequelize.authenticate();
        console.log('✓ Connected to database\n');

        // Create user_preferences table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        language VARCHAR(10) DEFAULT 'en',
        timezone VARCHAR(50) DEFAULT 'UTC',
        date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
        time_format VARCHAR(5) DEFAULT '12h',
        theme VARCHAR(10) DEFAULT 'system',
        accent_color VARCHAR(7) DEFAULT '#3B82F6',
        font_size VARCHAR(10) DEFAULT 'medium',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_preference (user_id)
      );
    `);

        console.log('✅ Created user_preferences table');

        // Show final schema
        const [columns] = await sequelize.query("SHOW COLUMNS FROM user_preferences;");
        console.log('\nTable Schema:');
        columns.forEach(col => {
            console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Default || 'NULL'}`);
        });

        console.log('\n✅ Migration complete!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

createUserPreferencesTable();
