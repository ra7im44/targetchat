const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize } = require('../src/config/database');

async function runMigrations() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const migrations = [
            '20250116_add_ai_paused_to_chats.sql',
            '20250116_add_custom_fields.sql',
            '20250116_update_chats_table.sql',
            '20250116_create_chat_notes_table.sql'
        ];

        for (const file of migrations) {
            const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
            const statements = sql.split(';').filter(s => s.trim());

            console.log(`Running migration: ${file}`);
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await sequelize.query(statement);
                        console.log(`Executed: ${statement.substring(0, 50)}...`);
                    } catch (err) {
                        // Ignore duplicate column errors
                        if (err.original && err.original.code === 'ER_DUP_FIELDNAME') {
                            console.log(`Column already exists, skipping: ${statement.substring(0, 50)}...`);
                        } else {
                            console.error(`Error executing statement: ${statement}`, err);
                        }
                    }
                }
            }
        }

        console.log('Migrations completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigrations();
