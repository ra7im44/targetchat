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

async function createActivityLogsTable() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database\n');

        console.log('Creating activity_logs table...');

        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_action (action),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log('✅ activity_logs table created successfully!\n');

        // Verify
        const [result] = await sequelize.query("SHOW TABLES LIKE 'activity_logs';");
        if (result.length > 0) {
            console.log('✅ Verified: activity_logs table exists');

            const [cols] = await sequelize.query("DESCRIBE activity_logs;");
            console.log('\nTable structure:');
            cols.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type})`);
            });
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

createActivityLogsTable();
