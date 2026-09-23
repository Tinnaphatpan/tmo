import { Role } from '../domain/entities';

// SPEC §2.2 — JWT payload kept identical to the old system's.
export interface JwtPayload {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  schoolId: string | null;
}
