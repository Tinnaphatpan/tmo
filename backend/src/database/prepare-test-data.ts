/**
 * Makes a database ready for a hands-on test round of every role:
 *   1. a STAFF account (`staff1`, problem 1, all schools) if none exists;
 *   2. a TEAM_LEADER account for every school that doesn't already have one
 *      (so mentor/approval testing isn't limited to whichever few centres
 *      the production import happened to carry a team leader for);
 *   3. a stand-in signature image for every COMMITTEE / STAFF / TEAM_LEADER
 *      user that has none (approval needs both signatures);
 *   4. the full rotation queue (16 centres x 5 problems, 15-min slots from
 *      13:30) — skipped, with a note, if examining has already started.
 * Idempotent: safe to re-run. It goes through the same use-cases the admin UI
 * uses (validation, audit log), not raw SQL.
 *
 *   npm run prepare:test                      # queue date = today (Bangkok)
 *   npm run prepare:test -- --date 2026-05-17
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersRepository } from '../modules/users/users.repository';
import { UserAssignmentRepository } from '../modules/user-assignment/user-assignment.repository';
import { SchoolsRepository } from '../modules/schools/schools.repository';
import { ManageStaffAssignmentsUseCase } from '../modules/admin/use-cases/manage-staff.use-case';
import { ManageTeamLeaderUseCase } from '../modules/admin/use-cases/manage-team-leader.use-case';
import { UploadSignatureUseCase } from '../modules/admin/use-cases/upload-signature.use-case';
import { GenerateQueueScheduleUseCase } from '../modules/admin/use-cases/generate-queue-schedule.use-case';
import { makeTestSignaturePng } from './test-signature';

const TEST_PASSWORD = 'password123';

/** `ศูนย์ สอวน. มหาวิทยาลัยขอนแก่น` (KKU) -> `teamleader-kku`; falls back to a
 * transliteration-free slug of the id when a school has no Code on file. */
function teamLeaderUsername(code: string | null, id: string): string {
  return `teamleader-${(code ?? id.slice(0, 8)).toLowerCase()}`;
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const pick = <T>(token: abstract new (...args: never[]) => T): T =>
    app.get(token as never, { strict: false });
  try {
    const users = pick(UsersRepository);
    const assignments = pick(UserAssignmentRepository);
    const schools = pick(SchoolsRepository);

    const admin = (await users.findAllByRole('ADMIN'))[0];
    if (!admin) throw new Error('No ADMIN user found — run `npm run seed` or migrate the data first.');

    // 1. STAFF account
    const staff = await users.findByUsername('staff1');
    if (staff) {
      console.log(`✓ staff1 already exists (role ${staff.role})`);
    } else {
      await pick(ManageStaffAssignmentsUseCase).create({
        username: 'staff1',
        displayName: 'เจ้าหน้าที่ข้อ 1',
        password: TEST_PASSWORD,
        assignments: [{ problemNumber: 1, schoolId: null }],
      });
      console.log(`+ created staff1 (password ${TEST_PASSWORD}, problem 1, all schools)`);
    }

    // 2. TEAM_LEADER per school (mentor test coverage — every centre, not
    // just whichever the production import happened to carry one for)
    const allSchools = await schools.findAll();
    const existingLeaders = await users.findAllByRole('TEAM_LEADER');
    const schooledLeaderIds = new Set(existingLeaders.map((u) => u.schoolId));
    let leadersCreated = 0;
    for (const school of allSchools) {
      if (schooledLeaderIds.has(school.id)) continue;
      const username = teamLeaderUsername(school.code, school.id);
      const existingByName = await users.findByUsername(username);
      if (existingByName) continue; // username taken by something else — leave it, don't collide
      await pick(ManageTeamLeaderUseCase).create({
        username,
        displayName: `หัวหน้าทีม ${school.name}`,
        password: TEST_PASSWORD,
        schoolId: school.id,
      });
      leadersCreated++;
      console.log(`+ created ${username} (password ${TEST_PASSWORD}, school ${school.name})`);
    }
    if (leadersCreated === 0) console.log('✓ every school already has a team leader');

    // 3. Signatures
    let signed = 0;
    for (const role of ['COMMITTEE', 'STAFF', 'TEAM_LEADER'] as const) {
      for (const user of await users.findAllByRole(role)) {
        if (user.signaturePath) continue;
        await pick(UploadSignatureUseCase).execute({
          userId: user.id,
          originalname: 'signature.png',
          buffer: makeTestSignaturePng(user.username),
        });
        signed++;
        console.log(`+ signature for ${user.username} (${role})`);
      }
    }
    if (signed === 0) console.log('✓ every non-admin user already has a signature');

    // 4. Queue schedule
    try {
      const res = await pick(GenerateQueueScheduleUseCase).execute({
        date: argValue('date'),
        actorId: admin.id,
      });
      console.log(
        `+ queue schedule: ${res.created} created, ${res.updated} re-timed (first slot ${res.firstSlotAt})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`! queue schedule skipped: ${message}`);
    }

    // Summary for the tester
    console.log('\nAccounts (password for all seeded/test accounts: see README):');
    for (const role of ['ADMIN', 'COMMITTEE', 'STAFF', 'TEAM_LEADER'] as const) {
      for (const u of await users.findAllByRole(role)) {
        const scope =
          role === 'TEAM_LEADER'
            ? `school ${u.schoolId}`
            : `${(await assignments.findScopeByUser(u.id)).map((a) => `ข้อ ${a.problemNumber}`).join(', ') || '-'}`;
        console.log(`  ${role.padEnd(12)} ${u.username.padEnd(14)} ${scope}`);
      }
    }
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
