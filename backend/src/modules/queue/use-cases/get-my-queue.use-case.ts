import { Injectable } from '@nestjs/common';
import { QueueItem, Score, Student } from '../../../domain/entities';
import { UserAssignmentRepository } from '../../user-assignment/user-assignment.repository';
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
  /** True while a score set this user submitted awaits team-leader approval — they can't claim the next item. */
  awaitingApproval: boolean;
  updatedAt: string;
}

/**
 * SPEC §2.5 GET /api/queue/mine — "เฉพาะข้อที่ตัวเองได้รับมอบหมาย" (SPEC §0
 * item 1: a judge scores one problem number across every school, never a
 * school's every problem). Filtering happens at the query level via the
 * assigned problem numbers, not as a client-side/UI-only filter.
 *
 * Also serves STAFF (delegated queue operation): a STAFF UserAssignment row
 * may carry a non-null SchoolId, narrowing them to one school for that
 * problem number — COMMITTEE's rows always have SchoolId=null (any school),
 * so the same filter covers both without role branching.
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
    private readonly userAssignmentRepository: UserAssignmentRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly scoresRepository: ScoresRepository,
  ) {}

  async execute(userId: string): Promise<MyQueueResult> {
    const scope = await this.userAssignmentRepository.findScopeByUser(userId);
    const problemNumbers = [...new Set(scope.map((s) => s.problemNumber))].sort((a, b) => a - b);
    const candidateItems = await this.queueRepository.findByProblemNumbersWithSchool(problemNumbers);
    const baseItems = candidateItems.filter((item) =>
      scope.some(
        (s) => s.problemNumber === item.problemNumber && (s.schoolId === null || s.schoolId === item.schoolId),
      ),
    );
    const settings = await this.settingsRepository.get();

    // Two batched reads instead of one query per item / per school.
    const [allStudents, allScores] = await Promise.all([
      this.studentsRepository.findBySchools([...new Set(baseItems.map((i) => i.schoolId))]),
      this.scoresRepository.findByQueueItems(baseItems.map((i) => i.id)),
    ]);
    const rosterBySchool = new Map<string, Student[]>();
    for (const s of allStudents) {
      const list = rosterBySchool.get(s.schoolId) ?? [];
      list.push(s);
      rosterBySchool.set(s.schoolId, list);
    }
    const scoresByItem = new Map<string, Score[]>();
    for (const sc of allScores) {
      const list = scoresByItem.get(sc.queueItemId) ?? [];
      list.push(sc);
      scoresByItem.set(sc.queueItemId, list);
    }

    const items: MyQueueItem[] = [];
    for (const item of baseItems) {
      const students = rosterBySchool.get(item.schoolId) ?? [];
      const scores = scoresByItem.get(item.id) ?? [];
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
        submittedByUserId: item.submittedByUserId,
        approvalStatus: item.approvalStatus,
        approvedByUserId: item.approvedByUserId,
        approvedAt: item.approvedAt,
        documentPath: item.documentPath,
        school: { id: item.schoolId, name: item.schoolName, code: item.schoolCode, students },
        scores,
      });
    }

    const current = items.find(
      (i) => i.status === 'IN_PROGRESS' && i.claimedByUserId === userId,
    );

    const awaitingApproval =
      (await this.queueRepository.findAwaitingApprovalBySubmitter(userId)) !== null;

    return {
      problemNumbers,
      items,
      currentItemId: current?.id ?? null,
      scoringLocked: settings.scoringLocked,
      awaitingApproval,
      updatedAt: new Date().toISOString(),
    };
  }
}
