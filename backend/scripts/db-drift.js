'use strict';

require('dotenv').config();
const { sequelize } = require('../src/models');
const { detectDrift } = require('../src/db/migrator');

(async () => {
  try {
    const drift = await detectDrift();
    if (!drift.length) {
      console.log('✅ No schema drift detected.');
      await sequelize.close();
      process.exit(0);
    }
    console.error(`❌ Schema drift detected in ${drift.length} place(s):`);
    for (const item of drift) {
      console.error(`  - ${item.table}: ${item.issue}${item.column ? ` (${item.column})` : ''}`);
    }
    await sequelize.close();
    process.exit(1);
  } catch (err) {
    console.error('❌ Drift check failed:', err.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
})();
