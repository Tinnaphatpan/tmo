import { Type } from 'class-transformer';
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

export class UpdateQueueItemDto {
  @IsUUID()
  schoolId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  problemNumber!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD' })
  date!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'เวลาต้องอยู่ในรูปแบบ HH:mm' })
  time!: string;
}

export class GenerateScheduleDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'เวลาเริ่มต้องอยู่ในรูปแบบ HH:mm' })
  startTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ระยะเวลาต่อช่องต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'ระยะเวลาต่อช่องต้องอย่างน้อย 1 นาที' })
  @Max(240, { message: 'ระยะเวลาต่อช่องต้องไม่เกิน 240 นาที' })
  slotMinutes?: number;
}
