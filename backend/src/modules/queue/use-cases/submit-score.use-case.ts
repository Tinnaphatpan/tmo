import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';
import { ScoresRepository } from '../../scores/scores.repository';
import { SettingsRepository } from '../../settings/settings.repository';
import { StudentsRepository } from '../../students/students.repository';
import { TransactionRunner } from '../../../database/transaction-runner';
import { QueueRepository } from '../queue.repository';

export interface SubmitScoreInput {
  queueItemId: string;
  judgeId: string;
  scores: Array<{ studentId: string; value: number }>;
}

/**
 * SPEC §2.5 POST /api/queue/[id]/score, §2.6, §1.4.
 * Checks run in this order: item exists → scoring not locked → caller holds
 * this item → submitted roster is exactly the school's roster (SPEC §2.6
 * "เทียบ Set studentId ที่คาดไว้ ... ต้องเท่ากันเป๊ะ") → then, in one
 * transaction: upsert every Score, write one AuditLog row per Score, close
 * the QueueItem out as DONE with ApprovalStatus=PENDING (awaiting the
 * school's TEAM_LEADER approval — see modules/approval).
 */
@Injectable()
export class SubmitScoreUseCase {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly scoresRepository: ScoresRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: SubmitScoreInput): Promise<void> {
    const item = await this.queueRepository.findById(input.queueItemId);
    if (!item) {
      throw new NotFoundException('ไม่พบรายการคิวนี้');
    }

    const settings = await this.settingsRepository.get();
    if (settings.scoringLocked) {
      throw new ForbiddenException('ปิดรับคะแนนแล้ว กรุณายื่นคำขอแก้ไขคะแนนแทน');
    }

    if (item.status !== 'IN_PROGRESS' || item.claimedByUserId !== input.judgeId) {
      throw new ForbiddenException('คุณไม่ได้ถือคิวนี้อยู่');
    }

    for (const s of input.scores) {
      if (s.value < 0 || s.value > 10) {
        throw new BadRequestException('คะแนนต้องอยู่ระหว่าง 0-10');
      }
    }

    const roster = await this.studentsRepository.findBySchool(item.schoolId);
    const expectedIds = new Set(roster.map((s) => s.id));
    const submittedIds = new Set(input.scores.map((s) => s.studentId));
    const isCompleteMatch =
      expectedIds.size === submittedIds.size &&
      [...expectedIds].every((id) => submittedIds.has(id));
    if (!isCompleteMatch) {
      throw new BadRequestException('ต้องกรอกคะแนนให้ครบทุกคนในศูนย์');
    }

    await this.transactionRunner.run(async (tx) => {
      for (const s of input.scores) {
        const { score, oldValue } = await this.scoresRepository.upsertOne(
          {
            studentId: s.studentId,
            queueItemId: input.queueItemId,
            value: s.value,
            judgeId: input.judgeId,
          },
          tx,
        );
        await this.auditLogRepository.create(
          {
            action: oldValue === null ? 'SCORE_CREATED' : 'SCORE_UPDATED',
            entityType: 'Score',
            entityId: score.id,
            oldValue: oldValue === null ? null : oldValue.toFixed(2),
            newValue: score.value.toFixed(2),
            performedBy: input.judgeId,
          },
          tx,
        );
      }
      await this.queueRepository.markPendingApproval(input.queueItemId, input.judgeId, tx);
    });
  }
}
