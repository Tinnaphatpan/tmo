import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// SPEC §2.2 — logout just drops the cookie; JWT TTL is short enough that no
// server-side revocation list is needed.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
