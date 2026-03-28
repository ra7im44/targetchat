require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create database connection
const sequelize = new Sequelize(
    process.env.DB_NAME || 'targetchat',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: console.log
    }
);

async function migrateChats() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Get all users
        const [users] = await sequelize.query('SELECT id FROM users');

        for (const user of users) {
            // Find user's personal workspace
            const [workspaces] = await sequelize.query(`
                SELECT id FROM workspaces 
                WHERE owner_id = ? AND name LIKE '%Personal Workspace' 
                LIMIT 1
            `, {
                replacements: [user.id]
            });

            if (workspaces.length > 0) {
                const workspaceId = workspaces[0].id;

                // Update user's chats that have no workspace
                const [result] = await sequelize.query(`
                    UPDATE chats 
                    SET workspace_id = ? 
                    WHERE userId = ? AND workspace_id IS NULL
                `, {
                    replacements: [workspaceId, user.id]
                });

                console.log(`✅ Migrated ${result.affectedRows} chats for user ${user.id} to workspace ${workspaceId}`);
            } else {
                console.log(`⚠️ No personal workspace found for user ${user.id}`);
            }
        }

        console.log('🎉 Chat migration completed!');
        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

migrateChats();
