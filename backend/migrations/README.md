# Migrations

The runner lives in `src/db/migrator.js` and is executed automatically at
startup unless `DB_AUTO_MIGRATE=false`.

## How it works

1. `sequelize.sync()` is called **without** `alter` or `force`. It only creates
   missing tables and indexes, so it is safe on an existing database and makes a
   brand-new database usable in one step.
2. Every `.sql` file in this directory runs in lexical filename order, exactly
   once, inside a transaction.
3. Applied files are recorded in `schema_migrations` with a SHA-256 checksum.
   Editing an applied migration is rejected — add a new file instead.
4. After migrating, model attributes are compared with the real schema. Drift is
   logged; set `DB_STRICT_SCHEMA=true` to make drift fatal in CI.

## Legacy SQL

`legacy/` holds the old one-off repair scripts that predate the runner. They
were written for already-existing databases and are **not** executed
automatically — replaying them on a fresh schema fails with "duplicate column".
Keep them for forensics; put every new change in a new top-level `.sql` file.

## Conventions

- Filename: `YYYYMMDD_short_description.sql`.
- Prefer **one statement per file** (portable across SQLite and MariaDB).
- Never use `DROP`, `TRUNCATE`, or destructive `ALTER` without a backup plan.
- SQLite and MariaDB do not share all DDL syntax; test both when adding SQL.

## Commands

```bash
npm run db:migrate   # apply baseline + pending migrations
npm run db:status    # applied / pending / drift
npm run db:drift     # drift only (non-zero exit when drift exists)
```
