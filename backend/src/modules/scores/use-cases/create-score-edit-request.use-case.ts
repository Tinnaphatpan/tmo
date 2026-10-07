import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, ScoreEditRequest } from '../../../domain/entities';
import { QueueRepository } from '../../queue/queue.repository';
import { ScoresRepository } from '../scores.repository';
import { ScoreEditRequestsRepository } from '../score-edit-requests.repository';
import { TransactionRunner } from '../../../database/transaction-runner';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';

export interface CreateScoreEditRequestInput {
  scoreId: string;
  /** The requesting user's id (judge or team leader). */
  judgeId: string;
  /** Omitted = COMMITTEE/STAFF behaviour (must own the score). */
  requesterRole?: Role;
  /** The requesting TEAM_LEADER's own school (DB-reloaded, never client-supplied). */
  requesterSchoolId?: string | null;
  newValue: number;
  reason: string;
}

/**
 * SPEC §2.5 POST /api/score-edit-requests. A COMMITTEE/STAFF judge may only
 * request a correction to a score they entered; a TEAM_LEADER (mentor) may
 * request one for any score of their own school — the judge who scored that
 * problem then reviews it (see ReviewScoreEditRequestUseCase).
 */
@Injectable()
export class CreateScoreEditRequestUseCase {
  constructor(
    private readonly scoresRepository: ScoresRepository,
    private readonly scoreEditRequestsRepository: ScoreEditRequestsRepository,
    private readonly queueRepository: QueueRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: CreateScoreEditRequestInput): Promise<ScoreEditRequest> {
    const score = await this.scoresRepository.findById(input.scoreId);
    if (!score) {
      throw new NotFoundException('ไม่พบคะแนนนี้');
    }

    if (input.requesterRole === 'TEAM_LEADER') {
      const queueItem = await this.queueRepository.findById(score.queueItemId);
      if (!queueItem || queueItem.schoolId !== input.requesterSchoolId) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์ขอแก้ไขคะแนนของศูนย์นี้');
      }
    } else if (score.judgeId !== input.judgeId) {
      throw new ForbiddenException('คุณไม่ใช่กรรมการเจ้าของคะแนนนี้');
    }

    // The request row and its SCORE_EDIT_REQUESTED audit entry (which carries
    // the old value) commit together, so the old value is never lost.
    return this.transactionRunner.run(async (tx) => {
      const created = await this.scoreEditRequestsRepository.create(
        {
          scoreId: input.scoreId,
          requestedBy: input.judgeId,
          newValue: input.newValue,
          reason: input.reason,
        },
        tx,
      );
      await this.auditLogRepository.create(
        {
          action: 'SCORE_EDIT_REQUESTED',
          entityType: 'ScoreEditRequest',
          entityId: created.id,
          changes: [
            {
              fieldName: 'value',
              oldValue: score.value.toFixed(2),
              newValue: input.newValue.toFixed(2),
            },
          ],
          performedBy: input.judgeId,
        },
        tx,
      );
      return { ...created, oldValue: score.value };
    });
  }
}
