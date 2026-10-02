import "server-only";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export const SESSION_COOKIE_NAME = "tmo_session";

export type Role = "ADMIN" | "COMMITTEE" | "STAFF" | "TEAM_LEADER";

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
  if (role === "STAFF") return "/staff";
  return "/team-leader";
}

/**
 * Role gate for the role layouts. The JWT cookie is only decoded (not
 * verified) and its `role` claim goes stale when an admin changes the user's
 * role, so ask the backend who the caller is *now* (`GET /auth/me`, which
 * re-reads the DB). Wrong role -> that role's own home; expired/invalid ->
 * /login. If the backend is unreachable, fall back to the decoded cookie
 * (UX only — every API call is still authorized by the backend).
 */
export async function requireRole(required: Role | Role[]): Promise<SessionUser> {
  const allowed = Array.isArray(required) ? required : [required];
  const token = await getSessionToken();
  if (!token) redirect("/login");

  let fresh: SessionUser | null = null;
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 401) redirect("/login");
    if (res.ok) fresh = (await res.json()) as SessionUser;
  } catch (err) {
    // next/navigation's redirect() throws a control-flow error — let it through.
    if (isRedirectError(err)) throw err;
  }

  const session = fresh ?? (await getSession());
  if (!session) redirect("/login");
  if (!allowed.includes(session.role)) redirect(homePathForRole(session.role));
  return session;
}
