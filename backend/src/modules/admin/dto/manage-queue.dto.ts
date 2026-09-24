import { IsIn, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

export class CreateQueueItemDto {
  @IsUUID()
  schoolId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  problemNumber!: number;
}

export class MoveQueueItemDto {
  @IsUUID()
  id!: string;

  @IsIn(['up', 'down'], { message: 'direction ต้องเป็น up หรือ down' })
  direction!: 'up' | 'down';
}

export class GenerateScheduleDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD' })
  date?: string;
}
