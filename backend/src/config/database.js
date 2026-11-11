const { Sequelize } = require('sequelize');
const path = require('path');

// Dialect resolution order:
//   1. Explicit DB_DIALECT always wins.
//   2. Otherwise, if MySQL/MariaDB connection parameters were supplied, use
//      'mysql'. docker-compose.yml sets DB_HOST/DB_USER/DB_PASS/DB_NAME for the
//      MariaDB service but previously omitted DB_DIALECT, so the old
//      `|| 'sqlite'` default made the container silently open a throwaway
//      SQLite file instead of the provisioned database.
//   3. Otherwise SQLite (local development default — never break this).
const explicitDialect = (process.env.DB_DIALECT || '').trim().toLowerCase();
const hasMySqlParams = Boolean(
  (process.env.DB_HOST || '').trim() || (process.env.DB_NAME || '').trim()
);
const dialect =
  explicitDialect || (hasMySqlParams ? 'mysql' : 'sqlite');

let sequelize;
if (dialect === 'mysql' || dialect === 'mariadb') {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'targetchat',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
    }
  );
} else {
  const storage = process.env.DB_STORAGE || path.join(__dirname, '..', '..', 'data', 'targetchat.sqlite');
  sequelize = new Sequelize({ dialect: 'sqlite', storage, logging: false });
}

module.exports = { sequelize };
