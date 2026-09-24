/**
 * Rewinds a test round so it can be run again from a clean slate:
 * every score, edit request and approval is deleted, every queue item goes
 * back to WAITING (unclaimed, un-approved, no PDF), and scoring is unlocked.
 * Users, schools, students, the schedule and signatures are left alone.
 *
 * DESTRUCTIVE — it erases real scores. It therefore refuses to run without
 * `--yes`, and refuses when NODE_ENV=production.
 *
 *   npm run reset:test -- --yes
 */
import * as sql from 'mssql';
import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset scores while NODE_ENV=production.');
  }
  const database = requireEnv('DB_NAME');
  if (!process.argv.includes('--yes')) {
    console.log(
      `This DELETES all scores, edit requests and approvals in database "${database}" and rewinds every queue item to WAITING.\nRe-run with --yes to proceed:  npm run reset:test -- --yes`,
    );
    process.exit(1);
  }

  const pool = await new sql.ConnectionPool({
    server: requireEnv('DB_SERVER'),
    port: Number(process.env.DB_PORT ?? 1433),
    database,
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    options: {
      encrypt: process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    },
  }).connect();

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const run = async (label: string, query: string) => {
      const res = await new sql.Request(tx).query(query);
      console.log(`${label}: ${res.rowsAffected[0] ?? 0}`);
    };
    await run('score edit requests deleted', 'DELETE FROM ScoreEditRequest');
    await run('scores deleted', 'DELETE FROM Score');
    await run(
      'score audit rows deleted',
      "DELETE FROM AuditLog WHERE EntityType = 'Score' OR Action LIKE 'SCORE_%'",
    );
    await run(
      'queue items rewound',
      `UPDATE QueueItem SET Status = 'WAITING', ClaimedByUserId = NULL, ClaimedAt = NULL,
         CompletedAt = NULL, SubmittedByUserId = NULL, ApprovalStatus = 'NOT_SUBMITTED',
         ApprovedByUserId = NULL, ApprovedAt = NULL, DocumentPath = NULL`,
    );
    await run(
      'scoring unlocked',
      'UPDATE CompetitionSettings SET ScoringLocked = 0, LockedAt = NULL, LockedBy = NULL',
    );
    await tx.commit();
    console.log('Done.');
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
