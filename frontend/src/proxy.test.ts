import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

/** Unsigned JWT — the proxy only decodes (real verification is the backend Guard's job). */
function tokenFor(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64(payload)}.x`;
}

const future = () => Math.floor(Date.now() / 1000) + 3600;

function run(path: string, token?: string) {
  const req = new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `tmo_session=${token}` } : {},
  });
  return proxy(req);
}

function redirectPath(res: Response): string | null {
  const loc = res.headers.get("location");
  return loc ? new URL(loc).pathname : null;
}

describe("proxy session gate (UX redirect only)", () => {
  it("sends anonymous visitors to /login with a callbackUrl, for every protected prefix", () => {
    for (const path of ["/admin/schools", "/committee", "/staff", "/team-leader/approvals"]) {
      const res = run(path);
      expect(redirectPath(res)).toBe("/login");
      expect(new URL(res.headers.get("location")!).searchParams.get("callbackUrl")).toBe(path);
    }
  });

  it.each(["ADMIN", "COMMITTEE", "STAFF", "TEAM_LEADER"])(
    "lets a live %s session through to every area — role-vs-page gating is the layouts' job",
    (role) => {
      const token = tokenFor({ role, exp: future() });
      for (const path of ["/admin", "/committee", "/staff/x", "/team-leader"]) {
        expect(run(path, token).headers.get("location")).toBeNull();
      }
    },
  );

  it("does NOT redirect on a role/page mismatch (stale cookie role must not cause a loop with requireRole)", () => {
    const stale = tokenFor({ role: "COMMITTEE", exp: future() });
    expect(run("/staff", stale).headers.get("location")).toBeNull();
    expect(run("/team-leader", stale).headers.get("location")).toBeNull();
  });

  it("treats an expired or garbage token as logged out", () => {
    const expired = tokenFor({ role: "ADMIN", exp: Math.floor(Date.now() / 1000) - 10 });
    expect(redirectPath(run("/admin", expired))).toBe("/login");
    expect(redirectPath(run("/admin", "not-a-jwt"))).toBe("/login");
  });

  it("accepts a token with no exp claim as live", () => {
    expect(run("/admin", tokenFor({ role: "ADMIN" })).headers.get("location")).toBeNull();
  });

  it("does not gate public pages", () => {
    expect(run("/queue").headers.get("location")).toBeNull();
    expect(run("/login").headers.get("location")).toBeNull();
  });
});
