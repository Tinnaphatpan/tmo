import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
let pathname = "/admin";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, refresh }),
}));
const post = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { post: (...a: unknown[]) => post(...a), get: vi.fn() },
}));

import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Watermark } from "@/components/Watermark";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { LogoutButton } from "@/components/LogoutButton";

beforeEach(() => {
  post.mockReset();
  push.mockReset();
  refresh.mockReset();
  pathname = "/admin";
});

describe("StatusBadge", () => {
  it.each([
    ["WAITING", "รอตรวจ"],
    ["IN_PROGRESS", "กำลังตรวจ"],
    ["DONE", "ตรวจแล้ว"],
    ["PENDING_APPROVAL", "รออนุมัติ"],
    ["APPROVED", "อนุมัติแล้ว"],
  ])("%s renders its Thai label", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("uses the pending-approval token classes, and never wraps", () => {
    render(<StatusBadge status="PENDING_APPROVAL" />);
    const badge = screen.getByText("รออนุมัติ");
    expect(badge.className).toContain("bg-state-pending-approval-bg");
    expect(badge.className).toContain("whitespace-nowrap");
  });

  it("shows the pulse dot only while IN_PROGRESS", () => {
    const { container, rerender } = render(<StatusBadge status="IN_PROGRESS" />);
    expect(container.querySelector(".animate-soft-pulse")).not.toBeNull();
    rerender(<StatusBadge status="DONE" />);
    expect(container.querySelector(".animate-soft-pulse")).toBeNull();
  });

  it("falls back to the raw status for unknown values", () => {
    render(<StatusBadge status="WHATEVER" />);
    expect(screen.getByText("WHATEVER")).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("fires onClick and honours disabled", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>go</Button>);
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        go
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Watermark", () => {
  const decoded = (el: HTMLElement) =>
    decodeURIComponent(el.style.backgroundImage.replace(/^url\("data:image\/svg\+xml,/, "").replace(/"\)$/, ""));

  it("tiles 'name · role · stamp', is click-through, aria-hidden and print-hidden", () => {
    const { container } = render(<Watermark displayName="สมชาย" role="COMMITTEE" stamp="23/9/2569 13:30" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.className).toContain("pointer-events-none");
    expect(el.className).toContain("print:hidden");
    expect(decoded(el)).toContain("สมชาย · กรรมการ · 23/9/2569 13:30");
  });

  it("escapes XML-special characters in the display name (no SVG injection)", () => {
    const { container } = render(<Watermark displayName={'<b>&"x'} role="STAFF" stamp="t" />);
    const svg = decoded(container.firstElementChild as HTMLElement);
    expect(svg).toContain("&lt;b&gt;&amp;&quot;x");
    expect(svg).not.toContain("<b>");
  });

  it("falls back to the raw role for unknown roles", () => {
    const { container } = render(<Watermark displayName="a" role="OTHER" stamp="t" />);
    expect(decoded(container.firstElementChild as HTMLElement)).toContain("a · OTHER · t");
  });
});

describe("AppSidebar", () => {
  const nav = [
    { href: "/admin", label: "ภาพรวม" },
    { href: "/admin/schools", label: "โรงเรียน" },
  ];

  it("renders the title, nav links and page content", () => {
    render(
      <AppSidebar title="ผู้ดูแลระบบ" nav={nav}>
        <p>page body</p>
      </AppSidebar>,
    );
    expect(screen.getByText("page body")).toBeInTheDocument();
    expect(screen.getAllByText("ผู้ดูแลระบบ").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "โรงเรียน" })[0]).toHaveAttribute("href", "/admin/schools");
  });

  it("highlights only the longest matching prefix (/admin must not stay active on /admin/schools)", () => {
    pathname = "/admin/schools";
    render(<AppSidebar title="t" nav={nav}>x</AppSidebar>);
    const [home] = screen.getAllByRole("link", { name: "ภาพรวม" });
    const [schools] = screen.getAllByRole("link", { name: "โรงเรียน" });
    expect(schools.className).toContain("bg-saed-500");
    expect(home.className).not.toContain("bg-saed-500");
  });

  it("marks the parent item active on its own path", () => {
    pathname = "/admin";
    render(<AppSidebar title="t" nav={nav}>x</AppSidebar>);
    expect(screen.getAllByRole("link", { name: "ภาพรวม" })[0].className).toContain("bg-saed-500");
  });

  it("mobile drawer opens from the menu button and closes via the backdrop", async () => {
    render(<AppSidebar title="t" nav={nav}>x</AppSidebar>);
    const menu = screen.getByRole("button", { name: "เมนู" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "ปิดเมนู" })).toBeNull();

    await userEvent.click(menu);
    expect(screen.getByRole("button", { name: "เมนู" })).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("button", { name: "ปิดเมนู" }));
    expect(screen.queryByRole("button", { name: "ปิดเมนู" })).toBeNull();
  });

  it("choosing a link in the drawer closes it", async () => {
    render(<AppSidebar title="t" nav={nav}>x</AppSidebar>);
    await userEvent.click(screen.getByRole("button", { name: "เมนู" }));
    const drawer = screen.getByRole("button", { name: "ปิดเมนู" }).parentElement!;
    await userEvent.click(within(drawer).getByRole("link", { name: "โรงเรียน" }));
    expect(screen.queryByRole("button", { name: "ปิดเมนู" })).toBeNull();
  });

  it("is hidden when printing", () => {
    const { container } = render(<AppSidebar title="t" nav={nav}>x</AppSidebar>);
    expect(container.querySelector("aside")?.className).toContain("print:hidden");
    expect(container.querySelector("header")?.className).toContain("print:hidden");
  });
});

describe("LogoutButton", () => {
  it("posts /auth/logout then routes to /login and refreshes", async () => {
    post.mockResolvedValue({});
    render(<LogoutButton />);
    await userEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
    expect(post).toHaveBeenCalledWith("/auth/logout");
    expect(push).toHaveBeenCalledWith("/login");
    expect(refresh).toHaveBeenCalled();
  });
});
