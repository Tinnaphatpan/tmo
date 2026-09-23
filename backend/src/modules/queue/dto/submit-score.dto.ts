import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class ScoreEntryDto {
  @IsUUID()
  studentId!: string;

  @Min(0, { message: 'คะแนนต้องอยู่ระหว่าง 0-10' })
  @Max(10, { message: 'คะแนนต้องอยู่ระหว่าง 0-10' })
  value!: number;
}

export class SubmitScoreDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'ต้องกรอกคะแนนอย่างน้อย 1 คน' })
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  scores!: ScoreEntryDto[];
}
