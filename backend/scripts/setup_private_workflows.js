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

async function setupPrivateWorkflows() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database\n');

        // Check if workflow_users table exists
        const [tables] = await sequelize.query("SHOW TABLES LIKE 'workflow_users';");

        if (tables.length > 0) {
            console.log('✅ workflow_users table already exists');

            // Show table structure
            const [columns] = await sequelize.query("SHOW COLUMNS FROM workflow_users;");
            console.log('\n📋 Table structure:');
            columns.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type})`);
            });
        } else {
            console.log('⚠️  workflow_users table does NOT exist. Creating...\n');

            // Create workflow_users table
            await sequelize.query(`
        CREATE TABLE workflow_users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          workflow_id VARCHAR(36) NOT NULL,
          user_id INT NOT NULL,
          assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          assigned_by INT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE KEY unique_workflow_user (workflow_id, user_id)
        );
      `);
            console.log('✅ Created workflow_users table');
        }

        // Check if is_public column exists in workflows table
        const [workflowColumns] = await sequelize.query("SHOW COLUMNS FROM workflows;");
        const hasIsPublic = workflowColumns.some(col => col.Field === 'is_public');

        if (hasIsPublic) {
            console.log('✅ is_public column already exists in workflows table');
        } else {
            console.log('⚠️  is_public column does NOT exist. Adding...\n');

            await sequelize.query(`
        ALTER TABLE workflows 
        ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE AFTER description;
      `);
            console.log('✅ Added is_public column to workflows table');
        }

        console.log('\n✅ All done! Private workflows setup complete.');

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

setupPrivateWorkflows();
