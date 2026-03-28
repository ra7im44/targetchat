require('dotenv').config({ path: 'backend/.env' });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'targetchatv1',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'root',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false
    }
);

async function checkSchema() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        const [results] = await sequelize.query('DESCRIBE chats');
        console.log('📊 Chats Table Schema:');
        console.table(results);

        const hasWorkspaceId = results.some(col => col.Field === 'workspace_id');
        if (hasWorkspaceId) {
            console.log('✅ workspace_id column EXISTS');
        } else {
            console.log('❌ workspace_id column MISSING');

            // Fix it immediately
            console.log('🛠️ Adding workspace_id column...');
            await sequelize.query(`
                ALTER TABLE chats 
                ADD COLUMN workspace_id INT NULL,
                ADD CONSTRAINT fk_chat_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
            `);
            console.log('✅ workspace_id column added successfully');
        }

        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkSchema();
