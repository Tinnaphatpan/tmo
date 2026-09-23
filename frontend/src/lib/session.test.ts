import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "tmo_session" && cookieValue ? { value: cookieValue } : undefined) }),
}));

import { homePathForRole, requireRole } from "./session";

/** Unsigned JWT — session.ts only decodes. */
function tokenFor(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64(payload)}.x`;
}
const future = () => Math.floor(Date.now() / 1000) + 3600;

const me = (role: string) => ({ id: "u", username: "u", displayName: "ผู้ใช้", role, schoolId: null });
const fetchMock = vi.fn();

/** Runs requireRole and returns either the session or the redirect target. */
async function run(required: Parameters<typeof requireRole>[0]) {
  try {
    return { session: await requireRole(required) };
  } catch (err) {
    const digest = (err as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return { redirectTo: digest.split(";")[2] };
    throw err;
  }
}

beforeEach(() => {
  cookieValue = tokenFor({ role: "COMMITTEE", exp: future() });
  process.env.BACKEND_URL = "http://backend.test";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("homePathForRole", () => {
  it("maps every role to its home", () => {
    expect(homePathForRole("ADMIN")).toBe("/admin");
    expect(homePathForRole("COMMITTEE")).toBe("/committee");
    expect(homePathForRole("STAFF")).toBe("/staff");
    expect(homePathForRole("TEAM_LEADER")).toBe("/team-leader");
  });
});

describe("requireRole (fresh role from GET /auth/me)", () => {
  it("returns the fresh session when the role matches, calling the backend with the bearer token", async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true, json: async () => me("COMMITTEE") });
    const res = await run("COMMITTEE");
    expect(res.session?.displayName).toBe("ผู้ใช้");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/auth/me",
      expect.objectContaining({ headers: { Authorization: `Bearer ${cookieValue}` }, cache: "no-store" }),
    );
  });

  it("redirects to the NEW role's home when the DB role changed after login (cookie still says COMMITTEE)", async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true, json: async () => me("TEAM_LEADER") });
    expect(await run("COMMITTEE")).toEqual({ redirectTo: "/team-leader" });
  });

  it("trusts the backend over the cookie in the other direction too (cookie says ADMIN, DB says STAFF)", async () => {
    cookieValue = tokenFor({ role: "ADMIN", exp: future() });
    fetchMock.mockResolvedValue({ status: 200, ok: true, json: async () => me("STAFF") });
    expect(await run("ADMIN")).toEqual({ redirectTo: "/staff" });
  });

  it("redirects to /login when there is no cookie (no backend call)", async () => {
    cookieValue = undefined;
    expect(await run("COMMITTEE")).toEqual({ redirectTo: "/login" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when the backend says 401 (expired token / deleted user)", async () => {
    fetchMock.mockResolvedValue({ status: 401, ok: false });
    expect(await run("COMMITTEE")).toEqual({ redirectTo: "/login" });
  });

  it("backend unreachable: falls back to the decoded cookie (still role-checked)", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    cookieValue = tokenFor({ role: "COMMITTEE", displayName: "จากคุกกี้", exp: future() });
    expect((await run("COMMITTEE")).session?.displayName).toBe("จากคุกกี้");
    expect(await run("ADMIN")).toEqual({ redirectTo: "/committee" });
  });

  it("backend unreachable and cookie expired -> /login", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    cookieValue = tokenFor({ role: "COMMITTEE", exp: Math.floor(Date.now() / 1000) - 5 });
    expect(await run("COMMITTEE")).toEqual({ redirectTo: "/login" });
  });

  it("other backend errors (e.g. 500) also fall back to the cookie rather than locking users out", async () => {
    fetchMock.mockResolvedValue({ status: 500, ok: false });
    expect((await run("COMMITTEE")).session).toBeDefined();
  });
});
