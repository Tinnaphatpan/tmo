import { Injectable } from '@nestjs/common';
import { QueueItemWithSchool, QueueRepository, StatusCounts } from '../../queue/queue.repository';
import { SchoolsRepository } from '../../schools/schools.repository';
import { StudentsRepository } from '../../students/students.repository';
import { UsersRepository } from '../../users/users.repository';
import { ScoreEditRequestsRepository } from '../../scores/score-edit-requests.repository';
import { SettingsRepository } from '../../settings/settings.repository';

export interface DashboardResult {
  queueCounts: StatusCounts;
  schoolCount: number;
  committeeCount: number;
  studentCount: number;
  /** Schools whose every queued problem is DONE (SPEC §5.4 "กรอกคะแนนครบแล้ว"). */
  schoolsFullyScored: number;
  pendingEditRequestCount: number;
  staleItems: QueueItemWithSchool[];
  /** So the lock/unlock button (SPEC §5.4) knows its current state without a separate call. */
  scoringLocked: boolean;
}

const STALE_THRESHOLD_MINUTES = 30;

/** SPEC §5.4 — /admin dashboard stat cards + stale-claim alert (not itemized in §2.5's table). */
@Injectable()
export class GetDashboardUseCase {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly scoreEditRequestsRepository: ScoreEditRequestsRepository,
    private readonly settingsRepository: SettingsRepository,
  ) {}

  async execute(): Promise<DashboardResult> {
    const [
      queueCounts,
      schools,
      committee,
      studentCount,
      allItems,
      editRequests,
      staleItems,
      settings,
    ] = await Promise.all([
      this.queueRepository.countByStatus(),
      this.schoolsRepository.findAll(),
      this.usersRepository.findAllCommittee(),
      this.studentsRepository.countAll(),
      this.queueRepository.findAllWithSchool(),
      this.scoreEditRequestsRepository.findAllWithContext(),
      this.queueRepository.findStaleInProgress(STALE_THRESHOLD_MINUTES),
      this.settingsRepository.get(),
    ]);

    const bySchool = new Map<string, QueueItemWithSchool[]>();
    for (const item of allItems) {
      const list = bySchool.get(item.schoolId) ?? [];
      list.push(item);
      bySchool.set(item.schoolId, list);
    }
    const schoolsFullyScored = [...bySchool.values()].filter(
      (items) => items.length > 0 && items.every((i) => i.status === 'DONE'),
    ).length;

    return {
      queueCounts,
      schoolCount: schools.length,
      committeeCount: committee.length,
      studentCount,
      schoolsFullyScored,
      pendingEditRequestCount: editRequests.filter((r) => r.status === 'PENDING').length,
      staleItems,
      scoringLocked: settings.scoringLocked,
    };
  }
}
