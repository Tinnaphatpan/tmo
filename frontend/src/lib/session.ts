import "server-only";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";

export const SESSION_COOKIE_NAME = "tmo_session";

export type Role = "ADMIN" | "COMMITTEE" | "MENTOR";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  schoolId: string | null;
}

/**
 * SPEC §2.2 — the Next.js server holds the JWT in an httpOnly cookie; the
 * browser never sees it. This decode is UX-only (which nav/redirect to show)
 * — real authorization always happens at the NestJS Guard, which re-verifies
 * the signature and re-queries the DB for the user on every request.
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function homePathForRole(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "COMMITTEE") return "/committee";
  return "/mentor";
}
