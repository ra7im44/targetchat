const { sequelize } = require('../src/config/database');
const { DataTypes } = require('sequelize');

async function migrate() {
  try {
    const qi = sequelize.getQueryInterface();
    const cols = await qi.describeTable('chats');
    if (!cols.routing_type) {
      await qi.addColumn('chats', 'routing_type', {
        type: DataTypes.STRING,
        defaultValue: 'ai'
      });
      console.log('✅ Added routing_type column');
    }
    if (!cols.tags) {
      await qi.addColumn('chats', 'tags', {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      });
      console.log('✅ Added tags column');
    }
    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
