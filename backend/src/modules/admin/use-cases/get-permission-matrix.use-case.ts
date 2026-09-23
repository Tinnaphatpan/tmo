import { Injectable } from '@nestjs/common';
import { Role } from '../../../domain/entities';
import {
  UserAssignmentRepository,
  UserAssignmentScope,
} from '../../user-assignment/user-assignment.repository';
import { UsersRepository } from '../../users/users.repository';

export interface PermissionMatrixRow {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  /** TEAM_LEADER scope mechanism (User.SchoolId); null for other roles. */
  schoolId: string | null;
  hasSignature: boolean;
  /** COMMITTEE/STAFF scope; always [] for TEAM_LEADER (scoped by schoolId instead). */
  assignments: UserAssignmentScope[];
}

const MATRIX_ROLES: Role[] = ['COMMITTEE', 'STAFF', 'TEAM_LEADER'];

/** Read-only view for the admin permission-matrix UI (Phase F4): every
 * non-admin user with their scope, in one call. */
@Injectable()
export class GetPermissionMatrixUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userAssignmentRepository: UserAssignmentRepository,
  ) {}

  async execute(): Promise<PermissionMatrixRow[]> {
    const groups = await Promise.all(MATRIX_ROLES.map((r) => this.usersRepository.findAllByRole(r)));
    return Promise.all(
      groups.flat().map(async (u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        schoolId: u.schoolId,
        hasSignature: u.signaturePath !== null,
        assignments:
          u.role === 'TEAM_LEADER' ? [] : await this.userAssignmentRepository.findScopeByUser(u.id),
      })),
    );
  }
}
