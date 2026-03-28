const { Sequelize } = require('sequelize');
const path = require('path');

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;
if (dialect === 'mysql') {
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
