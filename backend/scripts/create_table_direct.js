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

async function createTable() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database\n');

        console.log('Creating workflow_users table...');

        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS workflow_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_id VARCHAR(36) NOT NULL,
        user_id INT NOT NULL,
        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        assigned_by INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_workflow_user (workflow_id, user_id),
        KEY idx_workflow (workflow_id),
        KEY idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log('✅ Table created successfully!\n');

        // Verify
        const [result] = await sequelize.query("SHOW TABLES LIKE 'workflow_users';");
        if (result.length > 0) {
            console.log('✅ Verified: workflow_users table exists');

            const [cols] = await sequelize.query("DESCRIBE workflow_users;");
            console.log('\nTable structure:');
            console.table(cols);
        }

    } catch (err) {
        console.error('Error:', err.message);
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

createTable();
