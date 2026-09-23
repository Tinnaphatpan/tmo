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

describe("proxy role gate (UX redirect only)", () => {
  it("sends anonymous visitors to /login with a callbackUrl", () => {
    const res = run("/admin/schools");
    expect(redirectPath(res)).toBe("/login");
    expect(new URL(res.headers.get("location")!).searchParams.get("callbackUrl")).toBe("/admin/schools");
  });

  it.each([
    ["ADMIN", "/admin"],
    ["COMMITTEE", "/committee"],
    ["STAFF", "/staff"],
    ["TEAM_LEADER", "/team-leader"],
  ])("lets %s into %s and its sub-pages", (role, prefix) => {
    const token = tokenFor({ role, exp: future() });
    for (const path of [prefix, `${prefix}/anything`]) {
      const res = run(path, token);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it.each([
    ["COMMITTEE", "/admin", "/committee"],
    ["STAFF", "/committee", "/staff"],
    ["TEAM_LEADER", "/staff/x", "/team-leader"],
    ["ADMIN", "/team-leader", "/admin"],
  ])("redirects %s away from %s to its own home %s", (role, path, home) => {
    expect(redirectPath(run(path, tokenFor({ role, exp: future() })))).toBe(home);
  });

  it("treats an expired or garbage token as logged out", () => {
    const expired = tokenFor({ role: "ADMIN", exp: Math.floor(Date.now() / 1000) - 10 });
    expect(redirectPath(run("/admin", expired))).toBe("/login");
    expect(redirectPath(run("/admin", "not-a-jwt"))).toBe("/login");
  });

  it("does not gate public pages", () => {
    expect(run("/queue").headers.get("location")).toBeNull();
  });
});
