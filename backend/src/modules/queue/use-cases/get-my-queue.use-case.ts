import { Injectable } from '@nestjs/common';
import { QueueItem, Score, Student } from '../../../domain/entities';
import { CommitteeAssignmentRepository } from '../../committee/committee-assignment.repository';
import { SettingsRepository } from '../../settings/settings.repository';
import { ScoresRepository } from '../../scores/scores.repository';
import { StudentsRepository } from '../../students/students.repository';
import { QueueRepository } from '../queue.repository';

export interface MyQueueItem extends QueueItem {
  school: { id: string; name: string; code: string | null; students: Student[] };
  scores: Score[];
}

export interface MyQueueResult {
  problemNumbers: number[];
  items: MyQueueItem[];
  currentItemId: string | null;
  scoringLocked: boolean;
  updatedAt: string;
}

/**
 * SPEC §2.5 GET /api/queue/mine — "เฉพาะข้อที่ตัวเองได้รับมอบหมาย" (SPEC §0
 * item 1: a judge scores one problem number across every school, never a
 * school's every problem). Filtering happens at the query level via the
 * assigned problem numbers, not as a client-side/UI-only filter.
 *
 * Response shape follows SPEC's own notation literally — "items: [...พร้อม
 * school.students + scores]" — i.e. each item nests `school` (with its
 * `students` roster inside it) and a top-level `scores` array, so the
 * committee ScoreForm has everything it needs without further requests.
 */
@Injectable()
export class GetMyQueueUseCase {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly committeeAssignmentRepository: CommitteeAssignmentRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly scoresRepository: ScoresRepository,
  ) {}

  async execute(userId: string): Promise<MyQueueResult> {
    const problemNumbers =
      await this.committeeAssignmentRepository.findProblemNumbersByUser(userId);
    const baseItems = await this.queueRepository.findByProblemNumbersWithSchool(problemNumbers);
    const settings = await this.settingsRepository.get();

    const rosterCache = new Map<string, Student[]>();
    const items: MyQueueItem[] = [];
    for (const item of baseItems) {
      let students = rosterCache.get(item.schoolId);
      if (!students) {
        students = await this.studentsRepository.findBySchool(item.schoolId);
        rosterCache.set(item.schoolId, students);
      }
      const scores = await this.scoresRepository.findByQueueItem(item.id);
      items.push({
        id: item.id,
        schoolId: item.schoolId,
        problemNumber: item.problemNumber,
        status: item.status,
        position: item.position,
        scheduledAt: item.scheduledAt,
        claimedByUserId: item.claimedByUserId,
        claimedAt: item.claimedAt,
        completedAt: item.completedAt,
        school: { id: item.schoolId, name: item.schoolName, code: item.schoolCode, students },
        scores,
      });
    }

    const current = items.find(
      (i) => i.status === 'IN_PROGRESS' && i.claimedByUserId === userId,
    );

    return {
      problemNumbers,
      items,
      currentItemId: current?.id ?? null,
      scoringLocked: settings.scoringLocked,
      updatedAt: new Date().toISOString(),
    };
  }
}
