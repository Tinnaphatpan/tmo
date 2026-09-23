import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateTeamLeaderDto {
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุชื่อผู้ใช้' })
  username!: string;

  @IsString()
  @MinLength(1, { message: 'กรุณาระบุชื่อที่แสดง' })
  displayName!: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password!: string;

  @IsUUID(undefined, { message: 'กรุณาเลือกศูนย์สอบ' })
  schoolId!: string;
}

export class UpdateTeamLeaderDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password?: string;
}
