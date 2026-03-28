require('dotenv').config();
const { sequelize } = require('../src/models');
const { DataTypes } = require('sequelize');

async function up() {
    const queryInterface = sequelize.getQueryInterface();
    try {
        console.log('🔄 Checking for allowed_domains column...');

        // Check if column exists first to be safe (though addColumn handles it usually)
        const tableDesc = await queryInterface.describeTable('widgets');

        if (tableDesc.allowed_domains) {
            console.log('✅ Column allowed_domains already exists. Skipping.');
        } else {
            await queryInterface.addColumn('widgets', 'allowed_domains', {
                type: DataTypes.JSON,
                defaultValue: [],
                field: 'allowed_domains',
                allowNull: true
            });
            console.log('✅ Successfully added allowed_domains column');
        }

    } catch (err) {
        if (err.message && err.message.includes('Duplicate column')) {
            console.log('⚠️ Column already exists (caught error).');
        } else {
            console.error('❌ Migration failed:', err);
        }
    } finally {
        // Close connection
        await sequelize.close();
    }
}

up();
