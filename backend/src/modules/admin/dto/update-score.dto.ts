import { Max, Min } from 'class-validator';

export class UpdateScoreDto {
  @Min(0, { message: 'คะแนนต้องอยู่ระหว่าง 0-10' })
  @Max(10, { message: 'คะแนนต้องอยู่ระหว่าง 0-10' })
  value!: number;
}
