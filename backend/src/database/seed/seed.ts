/**
 * Dev/demo seed (SPEC.md §7 test accounts, §2.4 rotation). NOT the
 * production data migration — that's `npm run migrate:data` (SPEC §9),
 * which loads the real backup instead of this placeholder roster.
 *
 * Idempotent: skips entirely if School already has rows, so re-running is safe.
 *
 * Usage: npm run seed
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import * as sql from 'mssql';
import { MssqlSchoolsRepository } from '../../modules/schools/schools.repository.mssql';
import { MssqlUsersRepository } from '../../modules/users/users.repository.mssql';
import { MssqlCommitteeAssignmentRepository } from '../../modules/committee/committee-assignment.repository.mssql';
import { MssqlStudentsRepository } from '../../modules/students/students.repository.mssql';
import { MssqlQueueRepository } from '../../modules/queue/queue.repository.mssql';
import { generateSchedule } from '../../modules/queue/rotation';
import { SEED_SCHOOLS } from './schools-data';

const TEST_PASSWORD = 'password123';
const STUDENTS_PER_SCHOOL = 6;
const PROBLEM_COUNT = 5;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function main(): Promise<void> {
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
    const existing = await pool.request().query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM School');
    if (existing.recordset[0].cnt > 0) {
      console.log('School table is not empty — already seeded, skipping.');
      return;
    }

    const schoolsRepo = new MssqlSchoolsRepository(pool);
    const usersRepo = new MssqlUsersRepository(pool);
    const assignmentRepo = new MssqlCommitteeAssignmentRepository(pool);
    const studentsRepo = new MssqlStudentsRepository(pool);
    const queueRepo = new MssqlQueueRepository(pool);

    console.log(`Creating ${SEED_SCHOOLS.length} schools...`);
    const schools = [];
    for (const s of SEED_SCHOOLS) {
      schools.push(await schoolsRepo.create(s));
    }

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    console.log('Creating test accounts (SPEC §7)...');
    await usersRepo.create({
      username: 'admin',
      displayName: 'ผู้ดูแลระบบ',
      passwordHash,
      role: 'ADMIN',
      schoolId: null,
    });

    for (let problemNumber = 1; problemNumber <= PROBLEM_COUNT; problemNumber++) {
      const user = await usersRepo.create({
        username: `committee${problemNumber}`,
        displayName: `กรรมการข้อ ${problemNumber}`,
        passwordHash,
        role: 'COMMITTEE',
        schoolId: null,
      });
      await assignmentRepo.replaceForUser(user.id, [problemNumber]);
    }

    await usersRepo.create({
      username: 'mentor1',
      displayName: `ครูที่ปรึกษา ${schools[0].name}`,
      passwordHash,
      role: 'MENTOR',
      schoolId: schools[0].id,
    });

    console.log(`Creating ${STUDENTS_PER_SCHOOL} students per school...`);
    for (const school of schools) {
      for (let seqNo = 1; seqNo <= STUDENTS_PER_SCHOOL; seqNo++) {
        await studentsRepo.upsert({
          schoolId: school.id,
          seqNo,
          name: `นักเรียนคนที่ ${seqNo} (${school.code})`,
          studentCode: `${seqNo}${school.code}`,
        });
      }
    }

    console.log('Generating rotation schedule and queue items (SPEC §2.4)...');
    const cells = generateSchedule(
      schools.map((s) => ({ id: s.id, code: s.code })),
      { problemCount: PROBLEM_COUNT },
    );
    for (const cell of cells) {
      await queueRepo.create({
        schoolId: cell.schoolId,
        problemNumber: cell.problemNumber,
        position: cell.slot,
        scheduledAt: cell.scheduledAt,
      });
    }

    console.log(`Done. Seeded ${schools.length} schools, 7 users, ${schools.length * STUDENTS_PER_SCHOOL} students, ${cells.length} queue items.`);
    console.log(`All test accounts use the password: ${TEST_PASSWORD}`);
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
