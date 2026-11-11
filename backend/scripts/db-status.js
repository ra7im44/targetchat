'use strict';

require('dotenv').config();
const { sequelize } = require('../src/models');
const { status } = require('../src/db/migrator');

(async () => {
  try {
    const result = await status();
    console.log(JSON.stringify(result, null, 2));
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Could not read migration status:', err.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
})();
