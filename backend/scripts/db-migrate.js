'use strict';

require('dotenv').config();
const { sequelize } = require('../src/models');
const { migrate } = require('../src/db/migrator');

(async () => {
  try {
    const result = await migrate({ logger: console });
    console.log(`✅ Migrations complete. applied=${result.applied.length} pending=${result.pending.length} drift=${result.drift.length}`);
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
})();
