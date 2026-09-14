const { sequelize } = require('../src/config/database');
const { DataTypes } = require('sequelize');

async function migrate() {
  try {
    const qi = sequelize.getQueryInterface();
    const cols = await qi.describeTable('chats');
    if (!cols.pinned) {
      await qi.addColumn('chats', 'pinned', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
      console.log('✅ Added pinned column to chats');
    } else {
      console.log('ℹ️ pinned column already exists');
    }
    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
