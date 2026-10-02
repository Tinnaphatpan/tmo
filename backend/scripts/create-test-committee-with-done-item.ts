/**
 * One-off: create a COMMITTEE test account and give it a DONE item (so we
 * can click through the score-edit-request UI) without touching any real
 * production account. Safe to delete after use.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/create-test-committee-with-done-item.ts
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersRepository } from '../src/modules/users/users.repository';
import { QueueRepository } from '../src/modules/queue/queue.repository';
import { StudentsRepository } from '../src/modules/students/students.repository';
import { ManageCommitteeUseCase } from '../src/modules/admin/use-cases/manage-committee.use-case';
import { ClaimQueueItemUseCase } from '../src/modules/queue/use-cases/claim-queue-item.use-case';
import { SubmitScoreUseCase } from '../src/modules/queue/use-cases/submit-score.use-case';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const pick = <T>(token: abstract new (...args: never[]) => T): T =>
    app.get(token as never, { strict: false });
  try {
    const users = pick(UsersRepository);
    const queue = pick(QueueRepository);
    const students = pick(StudentsRepository);

    const username = 'committee-test1';
    let user = await users.findByUsername(username);
    if (user) {
      console.log(`✓ ${username} already exists`);
    } else {
      const created = await pick(ManageCommitteeUseCase).create({
        username,
        displayName: 'กรรมการทดสอบ (โปรดลบทิ้งภายหลัง)',
        password: 'password123',
        problemNumbers: [1],
      });
      user = await users.findById(created.id);
      console.log(`+ created ${username} (password password123, problem 1, all schools)`);
    }
    if (!user) throw new Error('could not load the user after create');

    // A WAITING item for problem 1 to turn into a DONE one this account owns.
    const waiting = (await queue.findByProblemNumbersWithSchool([1])).find(
      (i) => i.status === 'WAITING',
    );
    if (!waiting) {
      console.log('! no WAITING problem-1 item found — nothing to claim/score');
      return;
    }

    await pick(ClaimQueueItemUseCase).execute(user.id, waiting.id);
    const roster = await students.findBySchool(waiting.schoolId);
    await pick(SubmitScoreUseCase).execute({
      queueItemId: waiting.id,
      judgeId: user.id,
      scores: roster.map((s) => ({ studentId: s.id, value: 5 })),
    });
    console.log(
      `+ claimed + scored ${waiting.schoolName} (problem 1) as ${username} — now DONE, awaiting approval`,
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
