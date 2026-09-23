import { IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';

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
