import { IsIn } from 'class-validator';

export class ReviewScoreEditRequestDto {
  @IsIn(['approve', 'reject'], { message: 'action ต้องเป็น approve หรือ reject' })
  action!: 'approve' | 'reject';
}
