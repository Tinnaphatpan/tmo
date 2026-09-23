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
} from 'class-validator';

export class CreateCommitteeDto {
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
  @ArrayNotEmpty({ message: 'กรุณาเลือกอย่างน้อย 1 ข้อ' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  @Type(() => Number)
  problemNumbers!: number[];
}

export class UpdateCommitteeDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  @Type(() => Number)
  problemNumbers?: number[];

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password?: string;
}
