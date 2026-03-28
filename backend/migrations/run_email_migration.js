require('dotenv').config();
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runEmailMigration() {
    try {
        console.log('📧 Starting Email System Migration...\n');

        // Read SQL file
        const sqlPath = path.join(__dirname, 'create_email_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await sequelize.query(statement);
        }

        console.log('\n✅ Email tables created successfully!');
        console.log('   - email_templates');
        console.log('   - email_logs');
        console.log('   - email_preferences');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runEmailMigration();
