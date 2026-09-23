import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

const SESSION_COOKIE_NAME = "tmo_session";

const PROTECTED_PREFIXES = ["/admin", "/committee", "/staff", "/team-leader"];

/**
 * SPEC §2.2, last bullet — page-level gate only (UX redirect). Decodes the
 * JWT without verifying its signature: the actual authorization decision
 * always happens at the NestJS Guard (defense in depth).
 *
 * This proxy deliberately checks *only* "is there a live session?" and does
 * NOT compare roles: the `role` claim in the cookie goes stale when an admin
 * changes a user's role, so role-vs-page gating lives in the role layouts
 * (`requireRole` in lib/session.ts), which ask the backend for the current
 * role. Gating on the stale claim here would fight that (redirect loop).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let live = false;
  if (token) {
    try {
      const payload = decodeJwt(token);
      live = !(typeof payload.exp === "number" && payload.exp * 1000 < Date.now());
    } catch {
      live = false;
    }
  }

  if (!live) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/committee/:path*", "/staff/:path*", "/team-leader/:path*"],
};
