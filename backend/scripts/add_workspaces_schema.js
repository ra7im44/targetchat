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

async function addWorkspacesSchema() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // 1. Create workspaces table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INT NOT NULL,
        plan_type ENUM('free', 'team', 'enterprise') DEFAULT 'free',
        max_members INT DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_owner (owner_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('✅ Workspaces table created');

        // 2. Create workspace_members table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workspace_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('owner', 'manager', 'member') DEFAULT 'member',
        permissions JSON,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_member (workspace_id, user_id),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_workspace (workspace_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('✅ Workspace members table created');

        // 3. Create workspace_invitations table
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS workspace_invitations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workspace_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        role ENUM('manager', 'member') DEFAULT 'member',
        token VARCHAR(255) UNIQUE NOT NULL,
        invited_by INT NOT NULL,
        expires_at TIMESTAMP,
        accepted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id),
        INDEX idx_token (token),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('✅ Workspace invitations table created');

        // 4. Update chats table
        await sequelize.query(`
      ALTER TABLE chats 
      ADD COLUMN IF NOT EXISTS workspace_id INT NULL,
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
    `).catch(() => {
            console.log('⚠️  Chats columns may already exist, skipping...');
        });

        await sequelize.query(`
      ALTER TABLE chats 
      ADD CONSTRAINT fk_chat_workspace 
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
    `).catch(() => {
            console.log('⚠️  Chats foreign key may already exist, skipping...');
        });

        await sequelize.query(`
      ALTER TABLE chats 
      ADD INDEX IF NOT EXISTS idx_workspace (workspace_id);
    `).catch(() => {
            console.log('⚠️  Chats index may already exist, skipping...');
        });

        console.log('✅ Chats table updated');

        // 5. Update workflows table
        await sequelize.query(`
      ALTER TABLE workflows 
      ADD COLUMN IF NOT EXISTS workspace_id INT NULL;
    `).catch(() => {
            console.log('⚠️  Workflows column may already exist, skipping...');
        });

        await sequelize.query(`
      ALTER TABLE workflows 
      ADD CONSTRAINT fk_workflow_workspace 
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
    `).catch(() => {
            console.log('⚠️  Workflows foreign key may already exist, skipping...');
        });

        await sequelize.query(`
      ALTER TABLE workflows 
      ADD INDEX IF NOT EXISTS idx_workspace (workspace_id);
    `).catch(() => {
            console.log('⚠️  Workflows index may already exist, skipping...');
        });

        console.log('✅ Workflows table updated');

        // 6. Create default "Personal" workspace for all existing users
        console.log('📝 Creating personal workspaces for existing users...');

        const [users] = await sequelize.query('SELECT id, name, email FROM users');

        for (const user of users) {
            // Create personal workspace
            const [result] = await sequelize.query(`
        INSERT INTO workspaces (name, description, owner_id, plan_type, max_members)
        VALUES (?, ?, ?, 'free', 1)
      `, {
                replacements: [`${user.name}'s Personal Workspace`, 'Personal workspace', user.id]
            });

            const workspaceId = result;

            // Add user as owner
            await sequelize.query(`
        INSERT INTO workspace_members (workspace_id, user_id, role, permissions)
        VALUES (?, ?, 'owner', ?)
      `, {
                replacements: [
                    workspaceId,
                    user.id,
                    JSON.stringify({
                        canCreateWorkflows: true,
                        canEditWorkflows: true,
                        canDeleteWorkflows: true,
                        canViewAllChats: true,
                        canCreateChats: true,
                        canInviteMembers: false,
                        canManageMembers: false,
                        canManageBilling: true
                    })
                ]
            });

            console.log(`✅ Created personal workspace for user ${user.id} (${user.email})`);
        }

        console.log('✅ All personal workspaces created');
        console.log('🎉 Workspaces schema migration completed successfully!');

        await sequelize.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addWorkspacesSchema();
