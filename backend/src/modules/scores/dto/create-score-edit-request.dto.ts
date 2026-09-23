import { IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export class CreateScoreEditRequestDto {
  @IsUUID()
  scoreId!: string;

  @Min(0, { message: 'คะแนนต้องอยู่ระหว่าง 0-10' })
  @Max(10, { message: 'คะแนนต้องอยู่ระหว่าง 0-10' })
  newValue!: number;

  @IsNotEmpty({ message: 'กรุณาระบุเหตุผล' })
  reason!: string;
}
