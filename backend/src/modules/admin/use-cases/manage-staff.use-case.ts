import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AppConfig } from '../../../config/configuration';
import { isForeignKeyViolation, isUniqueViolation } from '../../../common/errors/sql-error.util';
import { UserAssignmentRepository, UserAssignmentScope } from '../../user-assignment/user-assignment.repository';
import { UsersRepository } from '../../users/users.repository';

export interface CreateStaffInput {
  username: string;
  displayName: string;
  password: string;
  assignments: UserAssignmentScope[];
}

export interface UpdateStaffInput {
  assignments?: UserAssignmentScope[];
  password?: string;
}

/** SchoolId=null within one request would be ambiguous to de-dup at the DB
 * level (SQL Server's plain UNIQUE treats multiple NULLs as distinct) — and
 * any exact (problemNumber, schoolId) repeat is just a bad request either
 * way, so catch all of it here rather than let a raw SQL error leak out. */
function validateNoDuplicateAssignments(assignments: UserAssignmentScope[]): void {
  const seen = new Set<string>();
  for (const a of assignments) {
    const key = `${a.problemNumber}:${a.schoolId ?? 'null'}`;
    if (seen.has(key)) {
      throw new BadRequestException('มีรายการมอบหมาย (ข้อ + ศูนย์) ซ้ำกันในคำขอเดียวกัน');
    }
    seen.add(key);
  }
}

/** Admin CRUD for STAFF accounts — mirrors ManageCommitteeUseCase, except
 * assignments carry an optional SchoolId (STAFF delegation scope, SPEC-driven
 * refactor) instead of always being "every school" like COMMITTEE. */
@Injectable()
export class ManageStaffAssignmentsUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userAssignmentRepository: UserAssignmentRepository,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  private hash(password: string): Promise<string> {
    const rounds = this.configService.get('bcryptSaltRounds', { infer: true });
    return bcrypt.hash(password, rounds);
  }

  async create(input: CreateStaffInput): Promise<{ id: string; username: string }> {
    validateNoDuplicateAssignments(input.assignments);
    const passwordHash = await this.hash(input.password);
    let user;
    try {
      user = await this.usersRepository.create({
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        role: 'STAFF',
        schoolId: null,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('ชื่อผู้ใช้นี้มีอยู่แล้ว');
      throw err;
    }
    await this.userAssignmentRepository.replaceForUser(user.id, input.assignments);
    return { id: user.id, username: user.username };
  }

  async update(id: string, input: UpdateStaffInput): Promise<void> {
    if (input.assignments) {
      validateNoDuplicateAssignments(input.assignments);
      await this.userAssignmentRepository.replaceForUser(id, input.assignments);
    }
    if (input.password) {
      const passwordHash = await this.hash(input.password);
      await this.usersRepository.updatePasswordHash(id, passwordHash);
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้นี้');
    if (user.role === 'ADMIN') {
      throw new ForbiddenException('ห้ามลบบัญชีผู้ดูแลระบบ');
    }
    try {
      await this.usersRepository.delete(id);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new ConflictException(
          'ไม่สามารถลบเจ้าหน้าที่คนนี้ได้ เนื่องจากยังถือคิวหรือมีประวัติการให้คะแนนอยู่ กรุณาคืนคิวก่อน',
        );
      }
      throw err;
    }
  }
}
