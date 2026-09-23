import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class StaffAssignmentDto {
  @IsInt()
  @Min(1)
  @Max(5)
  problemNumber!: number;

  /** null = every school for this problem number (rare for STAFF, but allowed). */
  @IsOptional()
  @IsUUID()
  schoolId!: string | null;
}

export class CreateStaffDto {
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุชื่อผู้ใช้' })
  username!: string;

  @IsString()
  @MinLength(1, { message: 'กรุณาระบุชื่อที่แสดง' })
  displayName!: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password!: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'กรุณาเลือกอย่างน้อย 1 รายการ' })
  @ValidateNested({ each: true })
  @Type(() => StaffAssignmentDto)
  assignments!: StaffAssignmentDto[];
}

export class UpdateStaffDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffAssignmentDto)
  assignments?: StaffAssignmentDto[];

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password?: string;
}
