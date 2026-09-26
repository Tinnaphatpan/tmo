import { Injectable } from '@nestjs/common';
import { StudentsRepository } from '../../students/students.repository';
import { ProblemCounts, QueueItemWithSchool, QueueRepository, StatusCounts } from '../queue.repository';

export interface PublicQueueItem {
  id: string;
  problemNumber: number;
  status: string;
  position: number;
  scheduledAt: string | null;
  /** studentCount = roster size only (no names — the board is public). */
  school: { id: string; name: string; code: string | null; studentCount: number };
}

export interface PublicQueueSlotCell {
  id: string;
  problemNumber: number;
  school: { id: string; name: string; code: string | null };
  status: string;
}

export interface PublicQueueResult {
  items: PublicQueueItem[];
  counts: StatusCounts;
  problemNumbers: number[];
  byProblem: ProblemCounts[];
  slots: Array<{ startsAt: string; cells: PublicQueueSlotCell[] }>;
  scheduleDate: string | null;
  updatedAt: string;
}

function toPublicItem(item: QueueItemWithSchool, studentCount: number): PublicQueueItem {
  return {
    id: item.id,
    problemNumber: item.problemNumber,
    status: item.status,
    position: item.position,
    scheduledAt: item.scheduledAt ? item.scheduledAt.toISOString() : null,
    school: { id: item.schoolId, name: item.schoolName, code: item.schoolCode, studentCount },
  };
}

/**
 * SPEC §2.5 GET /api/queue — the public board. Deliberately exposes only
 * school/status/position/scheduledAt: no Score, no judge/committee identity,
 * no ScoreEditRequest notes (SPEC §0 item 3 — public board must not leak
 * scores or who is judging).
 */
@Injectable()
export class GetPublicQueueUseCase {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly studentsRepository: StudentsRepository,
  ) {}

  async execute(): Promise<PublicQueueResult> {
    const items = await this.queueRepository.findAllWithSchool();
    const counts = await this.queueRepository.countByStatus();
    const byProblem = await this.queueRepository.countByProblem();
    const students = await this.studentsRepository.findBySchools([...new Set(items.map((i) => i.schoolId))]);
    const studentCounts = new Map<string, number>();
    for (const s of students) studentCounts.set(s.schoolId, (studentCounts.get(s.schoolId) ?? 0) + 1);
    const problemNumbers = [...new Set(items.map((i) => i.problemNumber))].sort((a, b) => a - b);

    const bySlot = new Map<string, QueueItemWithSchool[]>();
    for (const item of items) {
      if (!item.scheduledAt) continue;
      const key = item.scheduledAt.toISOString();
      const cells = bySlot.get(key) ?? [];
      cells.push(item);
      bySlot.set(key, cells);
    }
    const slots = [...bySlot.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([startsAt, cells]) => ({
        startsAt,
        cells: cells.map((c) => ({
          id: c.id,
          problemNumber: c.problemNumber,
          school: { id: c.schoolId, name: c.schoolName, code: c.schoolCode },
          status: c.status,
        })),
      }));

    const scheduledTimes = items
      .map((i) => i.scheduledAt)
      .filter((d): d is Date => d !== null)
      .map((d) => d.getTime());
    const scheduleDate =
      scheduledTimes.length > 0 ? new Date(Math.min(...scheduledTimes)).toISOString() : null;

    return {
      items: items.map((i) => toPublicItem(i, studentCounts.get(i.schoolId) ?? 0)),
      counts,
      problemNumbers,
      byProblem,
      slots,
      scheduleDate,
      updatedAt: new Date().toISOString(),
    };
  }
}
