import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AppConfig } from '../../../config/configuration';
import { isForeignKeyViolation, isUniqueViolation } from '../../../common/errors/sql-error.util';
import { UserAssignmentRepository } from '../../user-assignment/user-assignment.repository';
import { UsersRepository } from '../../users/users.repository';

export interface CreateCommitteeInput {
  username: string;
  displayName: string;
  password: string;
  problemNumbers: number[];
}

export interface UpdateCommitteeInput {
  problemNumbers?: number[];
  password?: string;
}

/** SPEC §2.5 — POST/PATCH/DELETE /api/admin/committee. COMMITTEE assignments
 * are always all-schools for a problem number (schoolId=null) — the
 * per-school scoping variant is for STAFF, see ManageStaffAssignmentsUseCase. */
@Injectable()
export class ManageCommitteeUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userAssignmentRepository: UserAssignmentRepository,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  private hash(password: string): Promise<string> {
    const rounds = this.configService.get('bcryptSaltRounds', { infer: true });
    return bcrypt.hash(password, rounds);
  }

  async create(input: CreateCommitteeInput): Promise<{ id: string; username: string }> {
    const passwordHash = await this.hash(input.password);
    let user;
    try {
      user = await this.usersRepository.create({
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        role: 'COMMITTEE',
        schoolId: null,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('ชื่อผู้ใช้นี้มีอยู่แล้ว');
      throw err;
    }
    await this.userAssignmentRepository.replaceForUser(
      user.id,
      input.problemNumbers.map((problemNumber) => ({ problemNumber, schoolId: null })),
    );
    return { id: user.id, username: user.username };
  }

  async update(id: string, input: UpdateCommitteeInput): Promise<void> {
    if (input.problemNumbers) {
      await this.userAssignmentRepository.replaceForUser(
        id,
        input.problemNumbers.map((problemNumber) => ({ problemNumber, schoolId: null })),
      );
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
          'ไม่สามารถลบกรรมการคนนี้ได้ เนื่องจากยังถือคิวหรือมีประวัติการให้คะแนนอยู่ กรุณาคืนคิวก่อน',
        );
      }
      throw err;
    }
  }
}
