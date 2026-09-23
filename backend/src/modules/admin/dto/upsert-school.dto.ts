import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อโรงเรียน' })
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class UpdateSchoolDto extends CreateSchoolDto {
  @IsUUID()
  id!: string;
}
