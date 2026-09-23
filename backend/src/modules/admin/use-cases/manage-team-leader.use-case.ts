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
import { SchoolsRepository } from '../../schools/schools.repository';
import { UsersRepository } from '../../users/users.repository';

export interface CreateTeamLeaderInput {
  username: string;
  displayName: string;
  password: string;
  schoolId: string;
}

export interface UpdateTeamLeaderInput {
  schoolId?: string;
  password?: string;
}

/** Admin CRUD for TEAM_LEADER accounts. Their scope is `User.SchoolId` (no
 * UserAssignment rows). Every operation refuses users of any other role, so
 * this endpoint can't be used to edit or delete e.g. an ADMIN. */
@Injectable()
export class ManageTeamLeaderUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  private hash(password: string): Promise<string> {
    const rounds = this.configService.get('bcryptSaltRounds', { infer: true });
    return bcrypt.hash(password, rounds);
  }

  private async requireSchool(schoolId: string): Promise<void> {
    if (!(await this.schoolsRepository.findById(schoolId))) {
      throw new BadRequestException('ไม่พบศูนย์สอบที่เลือก');
    }
  }

  private async requireTeamLeader(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้นี้');
    if (user.role !== 'TEAM_LEADER') {
      throw new ForbiddenException('บัญชีนี้ไม่ใช่หัวหน้าทีม');
    }
    return user;
  }

  async create(input: CreateTeamLeaderInput): Promise<{ id: string; username: string }> {
    await this.requireSchool(input.schoolId);
    const passwordHash = await this.hash(input.password);
    try {
      const user = await this.usersRepository.create({
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        role: 'TEAM_LEADER',
        schoolId: input.schoolId,
      });
      return { id: user.id, username: user.username };
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('ชื่อผู้ใช้นี้มีอยู่แล้ว');
      throw err;
    }
  }

  async update(id: string, input: UpdateTeamLeaderInput): Promise<void> {
    await this.requireTeamLeader(id);
    if (input.schoolId) {
      await this.requireSchool(input.schoolId);
      await this.usersRepository.updateRoleAndSchool(id, 'TEAM_LEADER', input.schoolId);
    }
    if (input.password) {
      await this.usersRepository.updatePasswordHash(id, await this.hash(input.password));
    }
  }

  async remove(id: string): Promise<void> {
    await this.requireTeamLeader(id);
    try {
      await this.usersRepository.delete(id);
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new ConflictException(
          'ไม่สามารถลบหัวหน้าทีมคนนี้ได้ เนื่องจากมีประวัติการอนุมัติหรือบันทึกอยู่',
        );
      }
      throw err;
    }
  }
}
