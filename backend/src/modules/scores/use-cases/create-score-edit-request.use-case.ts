import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ScoreEditRequest } from '../../../domain/entities';
import { ScoresRepository } from '../scores.repository';
import { ScoreEditRequestsRepository } from '../score-edit-requests.repository';

export interface CreateScoreEditRequestInput {
  scoreId: string;
  judgeId: string;
  newValue: number;
  reason: string;
}

/** SPEC §2.5 POST /api/score-edit-requests. */
@Injectable()
export class CreateScoreEditRequestUseCase {
  constructor(
    private readonly scoresRepository: ScoresRepository,
    private readonly scoreEditRequestsRepository: ScoreEditRequestsRepository,
  ) {}

  async execute(input: CreateScoreEditRequestInput): Promise<ScoreEditRequest> {
    const score = await this.scoresRepository.findById(input.scoreId);
    if (!score) {
      throw new NotFoundException('ไม่พบคะแนนนี้');
    }
    if (score.judgeId !== input.judgeId) {
      throw new ForbiddenException('คุณไม่ใช่กรรมการเจ้าของคะแนนนี้');
    }

    return this.scoreEditRequestsRepository.create({
      scoreId: input.scoreId,
      requestedBy: input.judgeId,
      oldValue: score.value,
      newValue: input.newValue,
      reason: input.reason,
    });
  }
}
