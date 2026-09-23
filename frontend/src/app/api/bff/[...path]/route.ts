import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/session";

/**
 * SPEC §1.2/§2.2 — the generic BFF proxy: every `/api/bff/*` call except
 * login/logout (which need to touch the cookie itself) lands here and is
 * forwarded to NestJS with `Authorization: Bearer <token>` attached from the
 * httpOnly cookie. The browser never sees the token.
 */
async function forward(
  request: NextRequest,
  path: string[],
): Promise<NextResponse> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { error: "ระบบยังไม่ได้ตั้งค่า BACKEND_URL" },
      { status: 500 },
    );
  }

  const token = await getSessionToken();
  const targetUrl = new URL(`${backendUrl}/${path.join("/")}`);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const passthroughHeaders = ["content-type", "content-disposition"];
  for (const name of passthroughHeaders) {
    const value = backendResponse.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  const body = await backendResponse.arrayBuffer();
  return new NextResponse(body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  return forward(request, (await ctx.params).path);
}
export async function POST(request: NextRequest, ctx: RouteContext) {
  return forward(request, (await ctx.params).path);
}
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return forward(request, (await ctx.params).path);
}
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return forward(request, (await ctx.params).path);
}
