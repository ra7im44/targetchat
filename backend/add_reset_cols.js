require('dotenv').config();
const { sequelize } = require('./src/models');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // Add columns if they don't exist
        await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255) NULL;").catch(err => console.log('Info: reset_password_token might already exist'));
        await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_expires DATETIME NULL;").catch(err => console.log('Info: reset_password_expires might already exist'));

        console.log('✅ Columns added successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
