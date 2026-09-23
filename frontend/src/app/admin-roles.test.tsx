import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import AdminPermissionsPage from "./admin/committee/page";

const apiError = (message: string) =>
  Object.assign(new Error("x"), { isAxiosError: true, response: { status: 409, data: { error: message } } });

const SCHOOL_A = { id: "sch-a", name: "ศูนย์ A", code: "A" };
const SCHOOL_B = { id: "sch-b", name: "ศูนย์ B", code: "B" };
const rows = [
  { id: "c1", username: "committee1", displayName: "กรรมการ 1", role: "COMMITTEE", schoolId: null, hasSignature: true, assignments: [{ problemNumber: 1, schoolId: null }] },
  { id: "s1", username: "staff1", displayName: "เจ้าหน้าที่ 1", role: "STAFF", schoolId: null, hasSignature: false, assignments: [{ problemNumber: 2, schoolId: "sch-a" }] },
  { id: "t1", username: "leader1", displayName: "หัวหน้า 1", role: "TEAM_LEADER", schoolId: "sch-a", hasSignature: false, assignments: [] },
];

beforeEach(() => {
  for (const fn of [get, post, patch, del]) fn.mockReset();
  get.mockImplementation(async (url: string) =>
    url === "/admin/permissions" ? { data: rows } : { data: [SCHOOL_A, SCHOOL_B] },
  );
});

async function openTab(name: string) {
  await userEvent.click(await screen.findByRole("button", { name }));
}

describe("Team leader management (create / edit / delete)", () => {
  it("shows the create form with a school picker, disabled until everything is filled", async () => {
    render(<AdminPermissionsPage />);
    await openTab("หัวหน้าทีม");
    expect(await screen.findByText("หัวหน้า 1")).toBeInTheDocument();
    expect(screen.getByText("ศูนย์: ศูนย์ A")).toBeInTheDocument();

    const create = screen.getByRole("button", { name: "สร้างบัญชี" });
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText("username"), "tl2");
    await userEvent.type(screen.getByPlaceholderText("ชื่อที่แสดง"), "หัวหน้า 2");
    await userEvent.type(screen.getByPlaceholderText("รหัสผ่าน (≥8 ตัว)"), "password123");
    expect(create).toBeDisabled(); // no school yet
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "ศูนย์สอบ" }), "sch-b");
    expect(create).toBeEnabled();
  });

  it("creates via POST /admin/team-leaders with schoolId", async () => {
    post.mockResolvedValue({});
    render(<AdminPermissionsPage />);
    await openTab("หัวหน้าทีม");
    await screen.findByText("หัวหน้า 1");
    await userEvent.type(screen.getByPlaceholderText("username"), "tl2");
    await userEvent.type(screen.getByPlaceholderText("ชื่อที่แสดง"), "หัวหน้า 2");
    await userEvent.type(screen.getByPlaceholderText("รหัสผ่าน (≥8 ตัว)"), "password123");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "ศูนย์สอบ" }), "sch-b");
    await userEvent.click(screen.getByRole("button", { name: "สร้างบัญชี" }));

    expect(post).toHaveBeenCalledWith("/admin/team-leaders", {
      username: "tl2",
      displayName: "หัวหน้า 2",
      password: "password123",
      schoolId: "sch-b",
    });
  });

  it("edit re-homes to another school via PATCH /admin/team-leaders", async () => {
    patch.mockResolvedValue({});
    render(<AdminPermissionsPage />);
    await openTab("หัวหน้าทีม");
    await userEvent.click(await screen.findByRole("button", { name: "แก้ไข" }));
    const row = screen.getByText("หัวหน้า 1").closest("div.p-3") as HTMLElement;
    await userEvent.selectOptions(within(row).getByRole("combobox", { name: "ศูนย์สอบ" }), "sch-b");
    await userEvent.click(within(row).getByRole("button", { name: "บันทึก" }));
    expect(patch).toHaveBeenCalledWith("/admin/team-leaders", {
      id: "t1",
      schoolId: "sch-b",
      password: undefined,
    });
  });

  it("delete goes to /admin/team-leaders after confirmation and shows a backend refusal", async () => {
    del.mockRejectedValueOnce(apiError("มีประวัติการอนุมัติอยู่"));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminPermissionsPage />);
    await openTab("หัวหน้าทีม");
    await userEvent.click(await screen.findByRole("button", { name: "ลบ" }));
    expect(del).toHaveBeenCalledWith("/admin/team-leaders", { params: { id: "t1" } });
    expect(await screen.findByText("มีประวัติการอนุมัติอยู่")).toBeInTheDocument();
    confirm.mockRestore();
  });
});

describe("Role change panel", () => {
  const rowOf = (name: string) => screen.getByText(name).closest("div.p-3") as HTMLElement;

  it("offers only the two OTHER roles (never ADMIN) and keeps confirm disabled until scope is chosen", async () => {
    render(<AdminPermissionsPage />);
    await userEvent.click((await screen.findAllByRole("button", { name: "เปลี่ยนบทบาท" }))[0]);
    const select = screen.getByRole("combobox", { name: "บทบาทใหม่" });
    expect([...select.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["เจ้าหน้าที่", "หัวหน้าทีม"]);
    expect(screen.queryByText("ผู้ดูแลระบบ")).toBeNull();
    expect(screen.getByRole("button", { name: "ยืนยันเปลี่ยนบทบาท" })).toBeDisabled();
  });

  it("COMMITTEE -> STAFF: sends role + (problem, school) assignments, then follows the user to the STAFF tab", async () => {
    patch.mockResolvedValue({});
    render(<AdminPermissionsPage />);
    await userEvent.click((await screen.findAllByRole("button", { name: "เปลี่ยนบทบาท" }))[0]); // committee1
    await userEvent.click(screen.getByRole("button", { name: "+ เพิ่มข้อ/ศูนย์" }));
    const panel = screen.getByRole("combobox", { name: "บทบาทใหม่" }).closest("div.rounded-lg") as HTMLElement;
    await userEvent.selectOptions(within(panel).getByRole("combobox", { name: "ข้อ" }), "3");
    await userEvent.selectOptions(within(panel).getByRole("combobox", { name: "ศูนย์" }), "sch-b");
    await userEvent.click(within(panel).getByRole("button", { name: "ยืนยันเปลี่ยนบทบาท" }));

    expect(patch).toHaveBeenCalledWith("/admin/users/c1/role", {
      role: "STAFF",
      assignments: [{ problemNumber: 3, schoolId: "sch-b" }],
    });
    // After reload the STAFF tab is showing.
    expect(await screen.findByText("เจ้าหน้าที่ 1")).toBeInTheDocument();
  });

  it("STAFF -> TEAM_LEADER: sends schoolId only", async () => {
    patch.mockResolvedValue({});
    render(<AdminPermissionsPage />);
    await openTab("เจ้าหน้าที่");
    await userEvent.click(await screen.findByRole("button", { name: "เปลี่ยนบทบาท" }));
    const panel = screen.getByRole("combobox", { name: "บทบาทใหม่" }).closest("div.rounded-lg") as HTMLElement;
    await userEvent.selectOptions(within(panel).getByRole("combobox", { name: "บทบาทใหม่" }), "TEAM_LEADER");
    await userEvent.selectOptions(within(panel).getByRole("combobox", { name: "ศูนย์สอบ" }), "sch-a");
    await userEvent.click(within(panel).getByRole("button", { name: "ยืนยันเปลี่ยนบทบาท" }));
    expect(patch).toHaveBeenCalledWith("/admin/users/s1/role", { role: "TEAM_LEADER", schoolId: "sch-a" });
  });

  it("switching the target role resets the chosen scope", async () => {
    render(<AdminPermissionsPage />);
    await userEvent.click((await screen.findAllByRole("button", { name: "เปลี่ยนบทบาท" }))[0]);
    await userEvent.click(screen.getByRole("button", { name: "+ เพิ่มข้อ/ศูนย์" })); // STAFF rows
    const panel = screen.getByRole("combobox", { name: "บทบาทใหม่" }).closest("div.rounded-lg") as HTMLElement;
    expect(within(panel).getByRole("button", { name: "ยืนยันเปลี่ยนบทบาท" })).toBeEnabled();
    await userEvent.selectOptions(within(panel).getByRole("combobox", { name: "บทบาทใหม่" }), "TEAM_LEADER");
    expect(within(panel).getByRole("button", { name: "ยืนยันเปลี่ยนบทบาท" })).toBeDisabled(); // no school yet
  });

  it("shows the backend's refusal (e.g. still holding a queue item) and leaves the panel open", async () => {
    patch.mockRejectedValue(apiError("ผู้ใช้ยังถือคิวอยู่"));
    render(<AdminPermissionsPage />);
    await userEvent.click((await screen.findAllByRole("button", { name: "เปลี่ยนบทบาท" }))[0]);
    await userEvent.click(screen.getByRole("button", { name: "+ เพิ่มข้อ/ศูนย์" }));
    await userEvent.click(screen.getByRole("button", { name: "ยืนยันเปลี่ยนบทบาท" }));
    expect(await screen.findByText("ผู้ใช้ยังถือคิวอยู่")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ยืนยันเปลี่ยนบทบาท" })).toBeInTheDocument();
    expect(rowOf("กรรมการ 1")).toBeInTheDocument();
  });

  it("cancel closes the panel without calling the API", async () => {
    render(<AdminPermissionsPage />);
    await userEvent.click((await screen.findAllByRole("button", { name: "เปลี่ยนบทบาท" }))[0]);
    await userEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(screen.queryByRole("combobox", { name: "บทบาทใหม่" })).toBeNull();
    expect(patch).not.toHaveBeenCalled();
  });
});
