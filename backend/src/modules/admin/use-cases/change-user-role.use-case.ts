import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../../domain/entities';
import { TransactionRunner } from '../../../database/transaction-runner';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';
import { QueueRepository } from '../../queue/queue.repository';
import { SchoolsRepository } from '../../schools/schools.repository';
import {
  UserAssignmentRepository,
  UserAssignmentScope,
} from '../../user-assignment/user-assignment.repository';
import { UsersRepository } from '../../users/users.repository';
import { validateNoDuplicateAssignments } from './manage-staff.use-case';

export type ChangeableRole = Extract<Role, 'COMMITTEE' | 'STAFF' | 'TEAM_LEADER'>;

export interface ChangeUserRoleInput {
  userId: string;
  actorId: string;
  role: ChangeableRole;
  /** COMMITTEE (schoolId ignored — always all schools) / STAFF. */
  assignments?: UserAssignmentScope[];
  /** TEAM_LEADER. */
  schoolId?: string;
}

/**
 * Moves a user between COMMITTEE, STAFF and TEAM_LEADER together with the
 * scope the new role needs, atomically, with an AuditLog entry. ADMIN is
 * deliberately out of reach in both directions (no accidental admin creation,
 * no locking out the last admin) — that stays a DB-level operation.
 */
@Injectable()
export class ChangeUserRoleUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userAssignmentRepository: UserAssignmentRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly queueRepository: QueueRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: ChangeUserRoleInput): Promise<void> {
    const user = await this.usersRepository.findById(input.userId);
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้นี้');
    if (user.role === 'ADMIN' || (input.role as Role) === 'ADMIN') {
      throw new ForbiddenException('ไม่สามารถเปลี่ยนบทบาทผู้ดูแลระบบผ่านหน้าเว็บได้');
    }
    if (user.role === input.role) {
      throw new BadRequestException('ผู้ใช้นี้มีบทบาทนี้อยู่แล้ว');
    }

    const holding = await this.queueRepository.findActiveClaimByUser(user.id);
    if (holding) {
      throw new ConflictException('ผู้ใช้ยังถือคิวอยู่ กรุณาให้คืนคิวหรือส่งคะแนนก่อนเปลี่ยนบทบาท');
    }

    let assignments: UserAssignmentScope[] = [];
    let schoolId: string | null = null;
    if (input.role === 'TEAM_LEADER') {
      if (!input.schoolId) throw new BadRequestException('กรุณาเลือกศูนย์สอบของหัวหน้าทีม');
      if (!(await this.schoolsRepository.findById(input.schoolId))) {
        throw new BadRequestException('ไม่พบศูนย์สอบที่เลือก');
      }
      schoolId = input.schoolId;
    } else {
      if (!input.assignments || input.assignments.length === 0) {
        throw new BadRequestException('กรุณาระบุข้อที่รับผิดชอบอย่างน้อย 1 รายการ');
      }
      if (input.role === 'COMMITTEE') {
        // COMMITTEE is always all-schools per problem (see ManageCommitteeUseCase).
        const problems = [...new Set(input.assignments.map((a) => a.problemNumber))];
        assignments = problems.map((problemNumber) => ({ problemNumber, schoolId: null }));
      } else {
        validateNoDuplicateAssignments(input.assignments);
        assignments = input.assignments;
        for (const schoolRef of new Set(assignments.map((a) => a.schoolId).filter(Boolean))) {
          if (!(await this.schoolsRepository.findById(schoolRef!))) {
            throw new BadRequestException('ไม่พบศูนย์สอบที่เลือก');
          }
        }
      }
    }

    const snapshot = (role: Role, sch: string | null, scope: UserAssignmentScope[]) =>
      JSON.stringify({ role, schoolId: sch, assignments: scope });
    const before = snapshot(
      user.role,
      user.schoolId,
      await this.userAssignmentRepository.findScopeByUser(user.id),
    );

    await this.transactionRunner.run(async (tx) => {
      await this.usersRepository.updateRoleAndSchool(user.id, input.role, schoolId, tx);
      if (input.role === 'TEAM_LEADER') {
        await this.userAssignmentRepository.deleteForUser(user.id, tx);
      } else {
        await this.userAssignmentRepository.replaceForUser(user.id, assignments, tx);
      }
      await this.auditLogRepository.create(
        {
          action: 'USER_ROLE_CHANGED',
          entityType: 'User',
          entityId: user.id,
          oldValue: before,
          newValue: snapshot(input.role, schoolId, assignments),
          performedBy: input.actorId,
        },
        tx,
      );
    });
  }
}
