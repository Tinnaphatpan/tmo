import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

const SESSION_COOKIE_NAME = "tmo_session";

const PREFIX_ROLE: Record<string, string> = {
  "/admin": "ADMIN",
  "/committee": "COMMITTEE",
  "/mentor": "MENTOR",
};

function roleHome(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "COMMITTEE") return "/committee";
  return "/mentor";
}

/**
 * SPEC §2.2, last bullet — page-level gate only (UX redirect). Decodes the
 * JWT without verifying its signature: that's fine here because the actual
 * authorization decision always happens at the NestJS Guard (defense in
 * depth), which re-verifies the signature and re-queries the DB for the
 * user on every request. This proxy just decides which page to show.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let role: string | null = null;
  if (token) {
    try {
      const payload = decodeJwt(token);
      const expired = typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
      if (!expired) role = (payload.role as string | undefined) ?? null;
    } catch {
      role = null;
    }
  }

  for (const [prefix, requiredRole] of Object.entries(PREFIX_ROLE)) {
    if (!pathname.startsWith(prefix)) continue;

    if (!role) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== requiredRole) {
      return NextResponse.redirect(new URL(roleHome(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/committee/:path*", "/mentor/:path*"],
};
