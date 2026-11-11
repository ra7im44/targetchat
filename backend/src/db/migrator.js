'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

/**
 * Migration system.
 *
 * Guarantees:
 *  - NEVER destructive: `sequelize.sync()` without alter/force only creates
 *    missing tables and indexes. Existing rows and columns are untouched.
 *  - Versioned: applied SQL migrations are recorded in `schema_migrations`
 *    with a checksum, so an edited migration is detected instead of silently
 *    diverging between environments.
 *  - Fresh installs: creating tables from the models is the baseline, so an
 *    empty database becomes fully usable with one command.
 *  - Existing installs: only pending SQL files run.
 *  - Drift: model columns are compared against the real schema; mismatches are
 *    reported (and can be made fatal with DB_STRICT_SCHEMA=true).
 */

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

function underscore(name) {
  return String(name).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function checksum(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function tableExists(queryInterface, table) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName || t.name))
    .filter(Boolean)
    .some((name) => String(name).toLowerCase() === String(table).toLowerCase());
}

async function ensureMigrationsTable(queryInterface) {
  if (await tableExists(queryInterface, MIGRATIONS_TABLE)) return;
  await queryInterface.createTable(MIGRATIONS_TABLE, {
    name: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true },
    checksum: { type: DataTypes.STRING(64), allowNull: true },
    applied_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });
}

function listMigrationFiles() {
  try {
    return fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.toLowerCase().endsWith('.sql'))
      .sort();
  } catch (err) {
    return [];
  }
}

/**
 * Split a .sql file into statements. One statement per file is recommended;
 * this keeps multi-statement files usable on SQLite where `db.exec` is not
 * available through Sequelize's query API.
 */
function splitSql(sql) {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return withoutComments
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function appliedMigrations() {
  try {
    const [rows] = await sequelize.query(`SELECT name, checksum FROM ${MIGRATIONS_TABLE}`);
    const map = new Map();
    for (const row of rows) map.set(row.name, row.checksum);
    return map;
  } catch (err) {
    return new Map();
  }
}

async function detectDrift() {
  const queryInterface = sequelize.getQueryInterface();
  const drift = [];

  for (const [modelName, model] of Object.entries(sequelize.models)) {
    const table = model.getTableName();
    const tableName = typeof table === 'string' ? table : table.tableName;
    if (!tableName) continue;

    if (!(await tableExists(queryInterface, tableName))) {
      drift.push({ model: modelName, table: tableName, issue: 'missing_table' });
      continue;
    }

    let description;
    try {
      description = await queryInterface.describeTable(tableName);
    } catch (err) {
      drift.push({ model: modelName, table: tableName, issue: 'unreadable_table' });
      continue;
    }
    const columns = new Set(Object.keys(description).map((c) => c.toLowerCase()));
    const underscored = Boolean(model.options && model.options.underscored);

    for (const [attrName, attr] of Object.entries(model.rawAttributes || {})) {
      if (attr && attr.type && attr.type.key === 'VIRTUAL') continue;
      const candidates = new Set(
        [attr && attr.field, attr && attr.fieldName, attrName]
          .filter(Boolean)
          .map((c) => String(c).toLowerCase())
      );
      if (underscored) candidates.add(underscore(attrName));
      const found = [...candidates].some((c) => columns.has(c));
      if (!found) {
        drift.push({
          model: modelName,
          table: tableName,
          issue: 'missing_column',
          column: (attr && (attr.field || attr.fieldName)) || attrName
        });
      }
    }
  }
  return drift;
}

/**
 * Run the migration pipeline.
 * @param {{logger?: Console, apply?: boolean}} options
 */
async function migrate({ logger = console, apply = true } = {}) {
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  await ensureMigrationsTable(queryInterface);

  // Baseline / additive schema. No alter, no force.
  if (apply) {
    await sequelize.sync();
  }

  const already = await appliedMigrations();
  const files = listMigrationFiles();
  const applied = [];
  const pending = [];

  for (const file of files) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const sum = checksum(sql);

    if (already.has(file)) {
      const previous = already.get(file);
      if (previous && previous !== sum) {
        throw new Error(
          `[migrate] ${file} was modified after being applied (checksum mismatch). ` +
          'Add a new migration instead of editing an applied one.'
        );
      }
      continue;
    }

    pending.push(file);
    if (!apply) continue;

    if (logger) logger.log(`[migrate] applying ${file}`);
    const transaction = await sequelize.transaction();
    try {
      for (const statement of splitSql(sql)) {
        await sequelize.query(statement, { transaction });
      }
      await sequelize.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (name, checksum) VALUES (:name, :checksum)`,
        { replacements: { name: file, checksum: sum }, transaction }
      );
      await transaction.commit();
      applied.push(file);
    } catch (err) {
      await transaction.rollback();
      throw new Error(`[migrate] ${file} failed: ${err.message}`);
    }
  }

  const drift = await detectDrift();
  if (drift.length && logger) {
    logger.warn(`[migrate] schema drift detected in ${drift.length} place(s):`);
    for (const item of drift.slice(0, 20)) {
      logger.warn(`  - ${item.table}: ${item.issue}${item.column ? ` (${item.column})` : ''}`);
    }
    if (String(process.env.DB_STRICT_SCHEMA || '').toLowerCase() === 'true') {
      throw new Error('[migrate] DB_STRICT_SCHEMA=true and schema drift was detected');
    }
  }

  return { applied, pending: pending.filter((p) => !applied.includes(p)), drift };
}

async function status() {
  const already = await appliedMigrations();
  const files = listMigrationFiles();
  return {
    applied: files.filter((f) => already.has(f)),
    pending: files.filter((f) => !already.has(f)),
    drift: await detectDrift()
  };
}

module.exports = { migrate, status, detectDrift, MIGRATIONS_DIR, MIGRATIONS_TABLE };
