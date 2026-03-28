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

async function createPrivateWorkflowsSchema() {
    try {
        await sequelize.authenticate();
        console.log('✓ Connected to database\n');

        // Step 1: Add is_public column to workflows table
        console.log('Step 1: Adding is_public column to workflows...');
        const [workflowColumns] = await sequelize.query("SHOW COLUMNS FROM workflows;");
        const workflowColumnNames = workflowColumns.map(c => c.Field);

        if (!workflowColumnNames.includes('is_public')) {
            await sequelize.query(`
        ALTER TABLE workflows 
        ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE AFTER description;
      `);
            console.log('✅ Added is_public column to workflows');
        } else {
            console.log('⊘ is_public column already exists in workflows');
        }

        // Step 2: Create workflow_users junction table
        console.log('\nStep 2: Creating workflow_users junction table...');
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS workflow_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workflow_id INT NOT NULL,
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

        // Step 3: Show final schemas
        console.log('\n--- Workflows Table Schema ---');
        const [workflowCols] = await sequelize.query("SHOW COLUMNS FROM workflows;");
        workflowCols.forEach(col => {
            console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Default || 'NULL'}`);
        });

        console.log('\n--- Workflow_Users Table Schema ---');
        const [junctionCols] = await sequelize.query("SHOW COLUMNS FROM workflow_users;");
        junctionCols.forEach(col => {
            console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Default || 'NULL'}`);
        });

        console.log('\n✅ Migration complete!');
        console.log('\n📝 Next steps:');
        console.log('  1. Create WorkflowUser model');
        console.log('  2. Update Workflow model associations');
        console.log('  3. Update API routes to filter workflows by user access');
        console.log('  4. Create admin routes for workflow assignment');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

createPrivateWorkflowsSchema();
