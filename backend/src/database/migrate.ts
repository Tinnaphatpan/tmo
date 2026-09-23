/**
 * Migration runner (SPEC.md §1.3, §2.1).
 *
 * No ORM ⇒ no auto-generated migrations. This walks `migrations/*.sql` in
 * filename order, runs every file not yet recorded in `_migrations`, and
 * records it — each file executes inside its own transaction so a bad
 * migration never leaves the schema half-applied.
 *
 * Usage: npm run migrate   (reads connection info from .env)
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as sql from 'mssql';

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function ensureDatabaseExists(config: sql.config): Promise<void> {
  const masterConfig: sql.config = { ...config, database: 'master' };
  const pool = await new sql.ConnectionPool(masterConfig).connect();
  try {
    await pool
      .request()
      .input('dbName', sql.NVarChar, config.database)
      .batch(
        `IF DB_ID(@dbName) IS NULL EXEC('CREATE DATABASE [' + @dbName + ']')`,
      );
  } finally {
    await pool.close();
  }
}

async function ensureMigrationsTable(pool: sql.ConnectionPool): Promise<void> {
  await pool.request().batch(`
    IF OBJECT_ID('dbo._migrations') IS NULL
    CREATE TABLE dbo._migrations (
      Filename  NVARCHAR(255) NOT NULL PRIMARY KEY,
      AppliedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  `);
}

async function getAppliedMigrations(
  pool: sql.ConnectionPool,
): Promise<Set<string>> {
  const result = await pool
    .request()
    .query<{ Filename: string }>('SELECT Filename FROM dbo._migrations');
  return new Set(result.recordset.map((r) => r.Filename));
}

async function runMigration(
  pool: sql.ConnectionPool,
  filename: string,
  sqlText: string,
): Promise<void> {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    await new sql.Request(transaction).batch(sqlText);
    await new sql.Request(transaction)
      .input('filename', sql.NVarChar, filename)
      .query(
        'INSERT INTO dbo._migrations (Filename) VALUES (@filename)',
      );
    await transaction.commit();
    console.log(`  applied ${filename}`);
  } catch (err) {
    await transaction.rollback();
    throw new Error(`Migration ${filename} failed: ${(err as Error).message}`);
  }
}

async function main(): Promise<void> {
  const config: sql.config = {
    server: requireEnv('DB_SERVER'),
    port: Number(process.env.DB_PORT ?? 1433),
    database: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    options: {
      encrypt: process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    },
    pool: {
      min: Number(process.env.DB_POOL_MIN ?? 2),
      max: Number(process.env.DB_POOL_MAX ?? 10),
    },
  };

  console.log(`Ensuring database "${config.database}" exists...`);
  await ensureDatabaseExists(config);

  const pool = await new sql.ConnectionPool(config).connect();
  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Applying ${pending.length} migration(s)...`);
    for (const file of pending) {
      const sqlText = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await runMigration(pool, file, sqlText);
    }
    console.log('Done.');
  } finally {
    await pool.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
