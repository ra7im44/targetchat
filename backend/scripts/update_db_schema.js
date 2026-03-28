const path = require('path');
// Load env vars explicitly
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('../src/models');

async function updateSchema() {
    try {
        console.log('Connecting to database...');
        console.log('Using Dialect:', process.env.DB_DIALECT);
        console.log('Using DB Name:', process.env.DB_NAME);

        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Add is_verified
        try {
            await sequelize.query("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;");
            console.log('Added is_verified column.');
        } catch (e) {
            if (e.message.includes("Duplicate column") || e.message.includes("check that it exists")) {
                console.log('is_verified column likely already exists or error:', e.message);
            } else {
                console.error('Error adding is_verified:', e.message);
            }
        }

        // Add verification_token
        try {
            await sequelize.query("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);");
            console.log('Added verification_token column.');
        } catch (e) {
            if (e.message.includes("Duplicate column") || e.message.includes("check that it exists")) {
                console.log('verification_token column likely already exists or error:', e.message);
            } else {
                console.error('Error adding verification_token:', e.message);
            }
        }

        // Now update all users to verified to fix the other bug
        try {
            await sequelize.query("UPDATE users SET is_verified = true WHERE is_verified IS NULL OR is_verified = false;");
            console.log('Updated existing users to is_verified = true');
        } catch (e) {
            console.error('Error updating users:', e.message);
        }

        console.log('Schema update and data fix complete.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

updateSchema();
