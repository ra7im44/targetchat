require('dotenv').config();
const { sequelize } = require('../src/models');

async function fixDatabase() {
    try {
        console.log('🔌 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected');

        console.log('⚠️  WARNING: This will drop and recreate all tables!');
        console.log('🔄 Force syncing database (dropping all tables)...');

        // Use force: true to drop and recreate all tables
        await sequelize.sync({ force: true });

        console.log('✅ Database force sync completed successfully!');
        console.log('📝 All tables have been recreated with the correct schema.');
        console.log('⚠️  Note: You will need to re-run any seed scripts to populate initial data.');

        await sequelize.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during fix:', err);
        await sequelize.close();
        process.exit(1);
    }
}

fixDatabase();

