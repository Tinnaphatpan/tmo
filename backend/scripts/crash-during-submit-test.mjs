// Crash-during-submit test: kill SQL Server while score submissions are in flight,
// restart it, then prove no score set was left half-written.
//
//   node --env-file=.env scripts/crash-during-submit-test.mjs submit --yes
//     -> claims + submits every WAITING item through the running backend, records
//        each HTTP outcome to a manifest. Kill/restart SQL Server while it runs.
//   node --env-file=.env scripts/crash-during-submit-test.mjs verify
//     -> reads the DB and checks the atomicity / durability invariants against the manifest.
//
// Refuses to run against TmoGradingQueue itself: point DB_NAME at a scratch copy
// (e.g. TmoGradingQueue_crashtest) and the backend at the same DB.

import { readFileSync, writeFileSync } from 'node:fs';
import sql from 'mssql';

const args = process.argv.slice(2);
const phase = args[0];
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DB_NAME = process.env.DB_NAME;
const BASE = opt('base', 'http://localhost:4001').replace(/\/$/, '');
const MANIFEST = opt('manifest', 'crash-test-manifest.json');
const CONCURRENCY = Number(opt('concurrency', '2'));
// Pause between items so the run lasts long enough to pull the plug mid-flight.
const DELAY_MS = Number(opt('delay', '1500'));
const REQUEST_TIMEOUT_MS = 15000;

if (!DB_NAME || DB_NAME === 'TmoGradingQueue') {
  console.error('Refusing to run: DB_NAME must be set and must not be the production TmoGradingQueue.');
  process.exit(1);
}

const dbConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT ?? 1433),
  database: DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
  requestTimeout: 15000,
  connectionTimeout: 5000,
};

const pool = () => new sql.ConnectionPool(dbConfig);

async function http(method, path, token, body) {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await res.text();
    return { status: res.status, body: text, ms: Date.now() - started };
  } catch (err) {
    return { status: 'NETWORK_ERROR', body: String(err?.message ?? err), ms: Date.now() - started };
  }
}

async function loginAdmin() {
  const r = await http('POST', '/auth/login', null, { username: 'admin', password: 'password123' });
  if (r.status !== 200) throw new Error(`admin login failed: ${r.status} ${r.body}`);
  return JSON.parse(r.body).token;
}

async function submitPhase() {
  if (!flag('yes')) {
    console.log('This WRITES scores through ' + BASE + '. Re-run with --yes to proceed.');
    process.exit(1);
  }
  const db = await pool().connect();
  const items = (
    await db.request().query(`
      SELECT q.Id AS itemId, q.SchoolId AS schoolId, s.Id AS studentId
      FROM QueueItem q
      JOIN Student s ON s.SchoolId = q.SchoolId
      WHERE q.Status = 'WAITING'
      ORDER BY q.ProblemNumber, q.SchoolId, s.SeqNo`)
  ).recordset;
  await db.close();

  // Group students by item.
  const byItem = new Map();
  for (const row of items) {
    if (!byItem.has(row.itemId)) byItem.set(row.itemId, []);
    byItem.get(row.itemId).push(row.studentId);
  }

  const token = await loginAdmin();
  const results = [];
  const queue = [...byItem.entries()];
  console.log(`Submitting ${queue.length} WAITING items with concurrency ${CONCURRENCY} via ${BASE}`);
  console.log('>>> You can now kill SQL Server (MSSQLSERVER) mid-run, then restart it. <<<');

  async function worker() {
    while (queue.length) {
      const [itemId, studentIds] = queue.shift();
      const claim = await http('POST', `/queue/${itemId}/claim`, token);
      const scores = studentIds.map((studentId) => ({
        studentId,
        value: Math.floor(Math.random() * 11),
      }));
      const entry = { itemId, claimStatus: claim.status, scores, scoreStatus: null, scoreBody: null };
      if (claim.status === 200 || claim.status === 201 || claim.status === 204) {
        const r = await http('POST', `/queue/${itemId}/score`, token, { scores });
        entry.scoreStatus = r.status;
        entry.scoreBody = r.body.slice(0, 200);
      } else {
        entry.scoreStatus = 'SKIPPED';
      }
      results.push(entry);
      process.stdout.write(`\r  done ${results.length}/${byItem.size}`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n');

  writeFileSync(MANIFEST, JSON.stringify({ db: DB_NAME, createdAt: new Date().toISOString(), results }, null, 2));
  const acked = results.filter((r) => r.scoreStatus === 200 || r.scoreStatus === 201).length;
  const failed = results.filter((r) => r.scoreStatus !== 200 && r.scoreStatus !== 201).length;
  console.log(`Manifest: ${MANIFEST}  acknowledged=${acked}  not-acknowledged=${failed}`);
}

async function verifyPhase() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  if (manifest.db !== DB_NAME) {
    throw new Error(`manifest was recorded against ${manifest.db}, DB_NAME is ${DB_NAME}`);
  }
  const db = await pool().connect();
  let failures = 0;
  const check = (ok, label, detail = '') => {
    console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` - ${detail}` : ''}`);
    if (!ok) failures++;
  };

  let partial = 0;
  let ackedButMissing = 0;
  let ackedWrongValue = 0;
  let statusMismatch = 0;
  let auditMismatch = 0;
  let committedNotAcked = 0;

  for (const r of manifest.results) {
    const rows = (
      await db
        .request()
        .input('itemId', sql.UniqueIdentifier, r.itemId)
        .query(`SELECT sc.StudentId AS studentId, sc.Value AS value, sc.Id AS scoreId
                FROM Score sc WHERE sc.QueueItemId = @itemId`)
    ).recordset;
    const item = (
      await db
        .request()
        .input('itemId', sql.UniqueIdentifier, r.itemId)
        .query('SELECT ApprovalStatus AS approval FROM QueueItem WHERE Id = @itemId')
    ).recordset[0];
    const expected = r.scores.length;

    // Atomicity: a score set is either entirely present or entirely absent.
    if (rows.length !== 0 && rows.length !== expected) partial++;

    const present = rows.length === expected;
    const acked = r.scoreStatus === 200 || r.scoreStatus === 201;

    if (acked && !present) ackedButMissing++;
    if (acked && present) {
      const byStudent = new Map(rows.map((x) => [x.studentId.toUpperCase(), Number(x.value)]));
      const wrong = r.scores.some((s) => byStudent.get(s.studentId.toUpperCase()) !== s.value);
      if (wrong) ackedWrongValue++;
    }
    if (!acked && present) committedNotAcked++; // committed before the crash, response lost

    // Consistency: scores present <=> the item was closed for approval in the same commit.
    if (present !== (item?.approval === 'PENDING')) statusMismatch++;

    // Every committed score has exactly one matching audit row in the same commit.
    if (present) {
      const audit = (
        await db
          .request()
          .input('itemId', sql.UniqueIdentifier, r.itemId)
          .query(`SELECT COUNT(*) AS n FROM AuditLog a
                  JOIN Score sc ON CAST(sc.Id AS NVARCHAR(100)) = a.EntityId
                  WHERE a.EntityType = 'Score' AND sc.QueueItemId = @itemId`)
      ).recordset[0].n;
      if (audit !== expected) auditMismatch++;
    }
  }

  console.log(`Verified ${manifest.results.length} items against ${DB_NAME}:`);
  check(partial === 0, 'no half-written score set (atomicity)', `partial=${partial}`);
  check(ackedButMissing === 0, 'every acknowledged submission is durable', `missing=${ackedButMissing}`);
  check(ackedWrongValue === 0, 'acknowledged values match what was submitted', `wrong=${ackedWrongValue}`);
  check(statusMismatch === 0, 'scores and approval status agree (consistency)', `mismatch=${statusMismatch}`);
  check(auditMismatch === 0, 'every committed score has its AuditLog row', `mismatch=${auditMismatch}`);
  console.log(`  info  committed but response lost to the crash: ${committedNotAcked}`);
  await db.close();
  if (failures) process.exit(1);
}

if (phase === 'submit') await submitPhase();
else if (phase === 'verify') await verifyPhase();
else {
  console.error('usage: crash-during-submit-test.mjs <submit|verify> [--yes] [--base URL] [--manifest FILE]');
  process.exit(1);
}
