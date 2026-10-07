/**
 * Production data migration (SPEC.md §9): the old system's data, backed up
 * as a `pg_dump` (PostgreSQL) plain-SQL file, into this MSSQL schema.
 *
 * Chosen approach — SPEC §9 option 2, "parse จากไฟล์ .sql นี้ตรง ๆ": this
 * sandbox has a PostgreSQL *data directory* but no server binaries
 * installed (no psql/pg_restore on PATH), so option 1 (restore to a live
 * Postgres, then SSMA/BCP into MSSQL) isn't available here — and per SPEC
 * §9, option 2 is the recommended path anyway for this data size (16
 * schools, ~96 students). `pg_dump`'s plain COPY-block text format is a
 * simple, well-defined format to parse directly with no extra tooling.
 *
 * cuid() ids from the old dump are discarded and replaced with fresh
 * UNIQUEIDENTIFIER values (SPEC §1.3) — every foreign key is remapped
 * through an old-id → new-GUID table built while migrating each parent
 * table, in FK-safe order: School → User → CommitteeAssignment →
 * QueueItem → Student → Score → CompetitionSettings → ScoreEditRequest →
 * AuditLog.
 *
 * Usage: npm run migrate:data -- path/to/tmo_db_backup_*.sql
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as sql from 'mssql';

export type Row = Record<string, string | null>;

export interface CopyBlock {
  columns: string[];
  rows: Row[];
}

export function unescapeCopyField(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === 't') { out += '\t'; i++; continue; }
      if (next === 'n') { out += '\n'; i++; continue; }
      if (next === 'r') { out += '\r'; i++; continue; }
      if (next === '\\') { out += '\\'; i++; continue; }
    }
    out += c;
  }
  return out;
}

/** Parses every `COPY public."Table" (cols...) FROM stdin; ... \.` block in a pg_dump. */
export function parseCopyBlocks(text: string): Map<string, CopyBlock> {
  const blocks = new Map<string, CopyBlock>();
  const lines = text.split('\n');
  const headerRe = /^COPY public\.(?:"([^"]+)"|(\w+))\s*\(([^)]*)\)\s*FROM stdin;$/;

  for (let i = 0; i < lines.length; i++) {
    const match = headerRe.exec(lines[i].trim());
    if (!match) continue;

    const table = match[1] ?? match[2];
    const columns = match[3].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const rows: Row[] = [];
    i++;
    while (i < lines.length && lines[i] !== '\\.') {
      const fields = lines[i].split('\t');
      const row: Row = {};
      columns.forEach((col, idx) => {
        const raw = fields[idx] ?? '';
        row[col] = raw === '\\N' ? null : unescapeCopyField(raw);
      });
      rows.push(row);
      i++;
    }
    blocks.set(table, { columns, rows });
  }
  return blocks;
}

export function toBool(v: string | null): boolean {
  return v === 't';
}

export function toDate(v: string | null): Date | null {
  return v === null ? null : new Date(v.replace(' ', 'T') + 'Z');
}

export function toDecimal(v: string | null): number | null {
  return v === null ? null : Number(v);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function migrateSchools(pool: sql.ConnectionPool, block: CopyBlock | undefined) {
  const idMap = new Map<string, string>();
  if (!block) return idMap;
  for (const row of block.rows) {
    const result = await pool
      .request()
      .input('name', sql.NVarChar, row.name)
      .input('code', sql.NVarChar, row.code)
      .query<{ Id: string }>(
        'INSERT INTO School (Name, Code) OUTPUT INSERTED.Id VALUES (@name, @code)',
      );
    idMap.set(row.id!, result.recordset[0].Id);
  }
  console.log(`  School: ${idMap.size} rows`);
  return idMap;
}

async function migrateUsers(
  pool: sql.ConnectionPool,
  block: CopyBlock | undefined,
  schoolIdMap: Map<string, string>,
) {
  const idMap = new Map<string, string>();
  if (!block) return idMap;
  for (const row of block.rows) {
    const schoolId = row.schoolId ? (schoolIdMap.get(row.schoolId) ?? null) : null;
    // The old dump's role enum predates the TEAM_LEADER/STAFF role split —
    // its 'MENTOR' rows are exactly what TEAM_LEADER replaced (SPEC.md role
    // rename), so remap here rather than let the new CK_User_Role reject them.
    const role = row.role === 'MENTOR' ? 'TEAM_LEADER' : row.role;
    const result = await pool
      .request()
      .input('username', sql.NVarChar, row.username)
      .input('displayName', sql.NVarChar, row.displayName)
      // bcrypt hashes are portable across implementations — carried over verbatim.
      .input('passwordHash', sql.NVarChar, row.passwordHash)
      .input('role', sql.VarChar, role)
      .input('schoolId', sql.UniqueIdentifier, schoolId)
      .query<{ Id: string }>(`
        INSERT INTO [User] (Username, DisplayName, PasswordHash, Role, SchoolId)
        OUTPUT INSERTED.Id
        VALUES (@username, @displayName, @passwordHash, @role, @schoolId)
      `);
    idMap.set(row.id!, result.recordset[0].Id);
  }
  console.log(`  User: ${idMap.size} rows`);
  return idMap;
}

async function migrateCommitteeAssignments(
  pool: sql.ConnectionPool,
  block: CopyBlock | undefined,
  userIdMap: Map<string, string>,
) {
  if (!block) return;
  let count = 0;
  for (const row of block.rows) {
    const userId = userIdMap.get(row.userId!);
    if (!userId) continue;
    await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('problemNumber', sql.Int, Number(row.problemNumber))
      .query('INSERT INTO CommitteeAssignment (UserId, ProblemNumber) VALUES (@userId, @problemNumber)');
    count++;
  }
  console.log(`  CommitteeAssignment: ${count} rows`);
}

async function migrateQueueItems(
  pool: sql.ConnectionPool,
  block: CopyBlock | undefined,
  schoolIdMap: Map<string, string>,
  userIdMap: Map<string, string>,
) {
  const idMap = new Map<string, string>();
  if (!block) return idMap;
  for (const row of block.rows) {
    const schoolId = schoolIdMap.get(row.schoolId!);
    if (!schoolId) continue; // orphaned reference — skip rather than fail the whole run
    const claimedBy = row.claimedByUserId ? (userIdMap.get(row.claimedByUserId) ?? null) : null;
    const result = await pool
      .request()
      .input('schoolId', sql.UniqueIdentifier, schoolId)
      .input('problemNumber', sql.Int, Number(row.problemNumber))
      .input('status', sql.VarChar, row.status)
      .input('position', sql.Int, Number(row.position))
      .input('scheduledAt', sql.DateTime2, toDate(row.scheduledAt))
      .input('claimedByUserId', sql.UniqueIdentifier, claimedBy)
      .input('claimedAt', sql.DateTime2, toDate(row.claimedAt))
      .input('completedAt', sql.DateTime2, toDate(row.completedAt))
      .query<{ Id: string }>(`
        INSERT INTO QueueItem (SchoolId, ProblemNumber, Status, Position, ScheduledAt, ClaimedByUserId, ClaimedAt, CompletedAt)
        OUTPUT INSERTED.Id
        VALUES (@schoolId, @problemNumber, @status, @position, @scheduledAt, @claimedByUserId, @claimedAt, @completedAt)
      `);
    idMap.set(row.id!, result.recordset[0].Id);
  }
  console.log(`  QueueItem: ${idMap.size} rows`);
  return idMap;
}

async function migrateStudents(
  pool: sql.ConnectionPool,
  block: CopyBlock | undefined,
  schoolIdMap: Map<string, string>,
) {
  const idMap = new Map<string, string>();
  if (!block) return idMap;
  for (const row of block.rows) {
    const schoolId = schoolIdMap.get(row.schoolId!);
    if (!schoolId) continue;
    const result = await pool
      .request()
      .input('studentCode', sql.NVarChar, row.studentCode)
      .input('seqNo', sql.Int, Number(row.seqNo))
      .input('name', sql.NVarChar, row.name)
      .input('schoolId', sql.UniqueIdentifier, schoolId)
      .query<{ Id: string }>(`
        INSERT INTO Student (StudentCode, SeqNo, Name, SchoolId)
        OUTPUT INSERTED.Id
        VALUES (@studentCode, @seqNo, @name, @schoolId)
      `);
    idMap.set(row.id!, result.recordset[0].Id);
  }
  console.log(`  Student: ${idMap.size} rows`);
  return idMap;
}

async function migrateScores(
  pool: sql.ConnectionPool,
  block: CopyBlock | undefined,
  studentIdMap: Map<string, string>,
  queueItemIdMap: Map<string, string>,
  userIdMap: Map<string, string>,
) {
  const idMap = new Map<string, string>();
  if (!block) return idMap;
  for (const row of block.rows) {
    const studentId = studentIdMap.get(row.studentId!);
    const queueItemId = queueItemIdMap.get(row.queueItemId!);
    const judgeId = userIdMap.get(row.judgeId!);
    if (!studentId || !queueItemId || !judgeId) continue;
    const result = await pool
      .request()
      .input('studentId', sql.UniqueIdentifier, studentId)
      .input('queueItemId', sql.UniqueIdentifier, queueItemId)
      .input('value', sql.Decimal(4, 2), toDecimal(row.value))
      .input('judgeId', sql.UniqueIdentifier, judgeId)
      .input('createdAt', sql.DateTime2, toDate(row.createdAt))
      .input('updatedAt', sql.DateTime2, toDate(row.updatedAt))
      .query<{ Id: string }>(`
        INSERT INTO Score (StudentId, QueueItemId, Value, JudgeId, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.Id
        VALUES (@studentId, @queueItemId, @value, @judgeId, @createdAt, @updatedAt)
      `);
    idMap.set(row.id!, result.recordset[0].Id);
  }
  console.log(`  Score: ${idMap.size} rows`);
  return idMap;
}

async function migrateSettings(
  pool: sql.ConnectionPool,
  block: CopyBlock | undefined,
  userIdMap: Map<string, string>,
) {
  if (!block || block.rows.length === 0) return;
  const row = block.rows[0]; // singleton
  const lockedBy = row.lockedBy ? (userIdMap.get(row.lockedBy) ?? null) : null;
  await pool
    .request()
    .input('locked', sql.Bit, toBool(row.scoringLocked))
    .input('lockedAt', sql.DateTime2, toDate(row.lockedAt))
    .input('lockedBy', sql.UniqueIdentifier, lockedBy)
    .query(`
      UPDATE CompetitionSettings
      SET ScoringLocked = @locked, LockedAt = @lockedAt, LockedBy = @lockedBy
      WHERE Id = 1
    `);
  console.log('  CompetitionSettings: 1 row (updated singleton)');
}

interface LegacyChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

/**
 * Splits a legacy audit payload into atomic field changes, matching what
 * migration 005 does to rows already in the database: JSON objects become one
 * change per key, the assignments array becomes one "problem:school" change
 * per entry, and plain-text values become a single "value" change.
 */
function legacyChanges(oldRaw: string | null, newRaw: string | null): LegacyChange[] {
  const asObject = (raw: string | null): Record<string, unknown> | null => {
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };
  const before = asObject(oldRaw);
  const after = asObject(newRaw);
  if (!before && !after) {
    return oldRaw === null && newRaw === null ? [] : [{ fieldName: 'value', oldValue: oldRaw, newValue: newRaw }];
  }

  const text = (v: unknown): string | null =>
    v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const changes: LegacyChange[] = [];
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of keys) {
    if (key === 'assignments') continue;
    const o = text(before?.[key]);
    const n = text(after?.[key]);
    if (o !== null || n !== null) changes.push({ fieldName: key, oldValue: o, newValue: n });
  }

  type Scope = { problemNumber: number; schoolId: string | null };
  const entryKey = (a: Scope) => `${a.problemNumber}:${a.schoolId ?? '*'}`;
  const beforeScopes = new Set(((before?.assignments as Scope[] | undefined) ?? []).map(entryKey));
  const afterScopes = new Set(((after?.assignments as Scope[] | undefined) ?? []).map(entryKey));
  for (const k of [...new Set([...beforeScopes, ...afterScopes])].sort()) {
    changes.push({
      fieldName: 'assignment',
      oldValue: beforeScopes.has(k) ? k : null,
      newValue: afterScopes.has(k) ? k : null,
    });
  }
  return changes;
}

async function migrateScoreEditRequests(
  pool: sql.ConnectionPool,
  block: CopyBlock | undefined,
  scoreIdMap: Map<string, string>,
  userIdMap: Map<string, string>,
) {
  if (!block) return;
  let count = 0;
  for (const row of block.rows) {
    const scoreId = scoreIdMap.get(row.scoreId!);
    const requestedBy = userIdMap.get(row.requestedBy!);
    if (!scoreId || !requestedBy) continue; // dangling ref to a Score not present in this dump
    const reviewedBy = row.reviewedBy ? (userIdMap.get(row.reviewedBy) ?? null) : null;
    const created = await pool
      .request()
      .input('scoreId', sql.UniqueIdentifier, scoreId)
      .input('requestedBy', sql.UniqueIdentifier, requestedBy)
      .input('newValue', sql.Decimal(4, 2), toDecimal(row.newValue))
      .input('reason', sql.NVarChar(sql.MAX), row.reason)
      .input('status', sql.VarChar, row.status)
      .input('reviewedBy', sql.UniqueIdentifier, reviewedBy)
      .input('reviewedAt', sql.DateTime2, toDate(row.reviewedAt))
      .input('createdAt', sql.DateTime2, toDate(row.createdAt))
      .query<{ Id: string }>(`
        INSERT INTO ScoreEditRequest (ScoreId, RequestedBy, NewValue, Reason, Status, ReviewedBy, ReviewedAt, CreatedAt)
        OUTPUT INSERTED.Id
        VALUES (@scoreId, @requestedBy, @newValue, @reason, @status, @reviewedBy, @reviewedAt, @createdAt)
      `);
    // The old value lives in the request's SCORE_EDIT_REQUESTED audit entry
    // (see migration 005), not on the request row.
    const audit = await pool
      .request()
      .input('entityId', sql.NVarChar, String(created.recordset[0].Id))
      .input('requestedBy', sql.UniqueIdentifier, requestedBy)
      .input('createdAt', sql.DateTime2, toDate(row.createdAt))
      .query<{ Id: string }>(`
        INSERT INTO AuditLog (Action, EntityType, EntityId, PerformedBy, CreatedAt)
        OUTPUT INSERTED.Id
        VALUES ('SCORE_EDIT_REQUESTED', 'ScoreEditRequest', @entityId, @requestedBy, @createdAt)
      `);
    await insertChanges(pool, audit.recordset[0].Id, [
      { fieldName: 'value', oldValue: toDecimal(row.oldValue)?.toFixed(2) ?? null, newValue: toDecimal(row.newValue)?.toFixed(2) ?? null },
    ]);
    count++;
  }
  console.log(`  ScoreEditRequest: ${count} rows`);
}

async function insertChanges(pool: sql.ConnectionPool, auditLogId: string, changes: LegacyChange[]) {
  for (const change of changes) {
    await pool
      .request()
      .input('auditLogId', sql.UniqueIdentifier, auditLogId)
      .input('fieldName', sql.NVarChar(50), change.fieldName)
      .input('oldValue', sql.NVarChar(sql.MAX), change.oldValue)
      .input('newValue', sql.NVarChar(sql.MAX), change.newValue)
      .query(`
        INSERT INTO AuditLogChange (AuditLogId, FieldName, OldValue, NewValue)
        VALUES (@auditLogId, @fieldName, @oldValue, @newValue)
      `);
  }
}

async function migrateAuditLog(
  pool: sql.ConnectionPool,
  block: CopyBlock | undefined,
  userIdMap: Map<string, string>,
) {
  if (!block) return;
  let count = 0;
  for (const row of block.rows) {
    const performedBy = userIdMap.get(row.userId!);
    if (!performedBy) continue;
    // EntityId is free text (no FK in this schema — audit rows must outlive
    // the entity they describe), and the old dump's Score entries use a
    // composite "studentId:queueItemId" key with no reliable 1:1 mapping to
    // a Score.id (especially when, as in this dump, Score itself is empty).
    // Left verbatim as a historical breadcrumb rather than guessed at.
    const header = await pool
      .request()
      .input('action', sql.NVarChar, row.action)
      .input('entityType', sql.NVarChar, row.entityType)
      .input('entityId', sql.NVarChar, row.entityId)
      .input('performedBy', sql.UniqueIdentifier, performedBy)
      .input('createdAt', sql.DateTime2, toDate(row.createdAt))
      .query<{ Id: string }>(`
        INSERT INTO AuditLog (Action, EntityType, EntityId, PerformedBy, CreatedAt)
        OUTPUT INSERTED.Id
        VALUES (@action, @entityType, @entityId, @performedBy, @createdAt)
      `);
    await insertChanges(pool, header.recordset[0].Id, legacyChanges(row.oldValue, row.newValue));
    count++;
  }
  console.log(`  AuditLog: ${count} rows`);
}

async function main(): Promise<void> {
  const dumpArg = process.argv[2];
  if (!dumpArg) {
    throw new Error('Usage: npm run migrate:data -- <path-to-pg-dump.sql>');
  }
  const dumpPath = path.resolve(dumpArg);
  console.log(`Parsing ${dumpPath}...`);
  const text = fs.readFileSync(dumpPath, 'utf8');
  const blocks = parseCopyBlocks(text);
  console.log(`Found COPY blocks for: ${[...blocks.keys()].join(', ')}`);

  const pool = await new sql.ConnectionPool({
    server: requireEnv('DB_SERVER'),
    port: Number(process.env.DB_PORT ?? 1433),
    database: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    options: {
      encrypt: process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    },
  }).connect();

  try {
    console.log('Migrating in FK-safe order...');
    const schoolIdMap = await migrateSchools(pool, blocks.get('School'));
    const userIdMap = await migrateUsers(pool, blocks.get('User'), schoolIdMap);
    await migrateCommitteeAssignments(pool, blocks.get('CommitteeAssignment'), userIdMap);
    const queueItemIdMap = await migrateQueueItems(pool, blocks.get('QueueItem'), schoolIdMap, userIdMap);
    const studentIdMap = await migrateStudents(pool, blocks.get('Student'), schoolIdMap);
    const scoreIdMap = await migrateScores(
      pool,
      blocks.get('Score'),
      studentIdMap,
      queueItemIdMap,
      userIdMap,
    );
    await migrateSettings(pool, blocks.get('CompetitionSettings'), userIdMap);
    await migrateScoreEditRequests(pool, blocks.get('ScoreEditRequest'), scoreIdMap, userIdMap);
    await migrateAuditLog(pool, blocks.get('AuditLog'), userIdMap);
    console.log('Data migration complete.');
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
