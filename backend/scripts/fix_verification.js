const { sequelize } = require('../src/models');

async function fixVerification() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();

        // Set all existing users to verified
        await sequelize.query("UPDATE users SET is_verified = true WHERE is_verified IS NULL OR is_verified = false;");

        console.log('All users have been verified.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixVerification();
