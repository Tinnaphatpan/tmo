import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/session", async (orig) => ({
  ...(await orig<typeof import("@/lib/session")>()),
  getSession: () => getSession(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { to });
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/use-public-queue", () => ({ usePublicQueue: () => null }));
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { post: vi.fn() },
}));

import RootPage from "./page";
import LoginPage from "./(public)/login/page";
import PublicQueuePage from "./(public)/queue/page";

async function redirectTarget(): Promise<string> {
  try {
    await RootPage();
  } catch (err) {
    return (err as { to: string }).to;
  }
  throw new Error("RootPage did not redirect");
}

beforeEach(() => getSession.mockReset());

describe("/ (entry point)", () => {
  it("sends visitors without a session to the login page (not to the queue board)", async () => {
    getSession.mockResolvedValue(null);
    expect(await redirectTarget()).toBe("/login");
  });

  it.each([
    ["ADMIN", "/admin"],
    ["COMMITTEE", "/committee"],
    ["STAFF", "/staff"],
    ["TEAM_LEADER", "/team-leader"],
  ])("sends a signed-in %s straight to %s", async (role, home) => {
    getSession.mockResolvedValue({ id: "u", username: "u", displayName: "u", role, schoolId: null });
    expect(await redirectTarget()).toBe(home);
  });
});

describe("login page", () => {
  it("offers a public link to the whole queue board", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /ดูคิวทั้งหมด/ });
    expect(link).toHaveAttribute("href", "/queue");
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeInTheDocument();
  });
});

describe("public queue board", () => {
  it("links back to the login page", () => {
    render(<PublicQueuePage />);
    expect(screen.getByRole("link", { name: "เข้าสู่ระบบ" })).toHaveAttribute("href", "/login");
  });
});
