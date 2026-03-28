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

async function updatePersonalWorkspaces() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        // Increase max_members for all Personal Workspaces
        const [result] = await sequelize.query(`
            UPDATE workspaces 
            SET max_members = 5 
            WHERE name LIKE '%Personal Workspace' AND plan_type = 'free'
        `);

        console.log(`✅ Updated max_members to 5 for ${result.affectedRows} personal workspaces`);

        // Also update permissions for owners just in case
        // We want to ensure they have canInviteMembers: true in the DB too, although code bypasses it now
        const [users] = await sequelize.query('SELECT id FROM users');

        for (const user of users) {
            await sequelize.query(`
                UPDATE workspace_members wm
                JOIN workspaces w ON wm.workspace_id = w.id
                SET wm.permissions = JSON_SET(wm.permissions, '$.canInviteMembers', true, '$.canManageMembers', true)
                WHERE w.owner_id = ? AND wm.user_id = ? AND w.name LIKE '%Personal Workspace'
            `, {
                replacements: [user.id, user.id]
            });
        }
        console.log('✅ Updated owner permissions for personal workspaces');

        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updatePersonalWorkspaces();
