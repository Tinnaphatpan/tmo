import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * SPEC §2.2 login flow: browser → this route → NestJS POST /auth/login →
 * NestJS returns a signed JWT → stored here as an httpOnly/secure/sameSite=lax
 * cookie → only `{ user }` (never the token) goes back to the browser.
 */
export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { error: "ระบบยังไม่ได้ตั้งค่า BACKEND_URL" },
      { status: 500 },
    );
  }

  const body = await request.text();

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" },
      { status: 502 },
    );
  }

  const data = await backendResponse.json();
  if (!backendResponse.ok) {
    return NextResponse.json(data, { status: backendResponse.status });
  }

  const response = NextResponse.json({ user: data.user });
  const maxAge = Number(process.env.SESSION_COOKIE_MAX_AGE_SECONDS ?? 43200);
  response.cookies.set(SESSION_COOKIE_NAME, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return response;
}
