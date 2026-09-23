import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { StaffAssignmentDto } from './upsert-staff.dto';

export class ChangeRoleDto {
  // ADMIN is intentionally not accepted — see ChangeUserRoleUseCase.
  @IsIn(['COMMITTEE', 'STAFF', 'TEAM_LEADER'], {
    message: 'บทบาทต้องเป็น COMMITTEE, STAFF หรือ TEAM_LEADER',
  })
  role!: 'COMMITTEE' | 'STAFF' | 'TEAM_LEADER';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffAssignmentDto)
  assignments?: StaffAssignmentDto[];

  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
