import { render, screen, waitFor, within } from "@testing-library/react";
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
vi.mock("@/lib/use-queue-stream", () => ({ useQueueStream: vi.fn() }));

import StaffPage from "./staff/page";
import ScoreboardPage from "./committee/scoreboard/page";
import TeamLeaderApprovalsPage from "./team-leader/approvals/page";
import AdminPermissionsPage from "./admin/committee/page";
import type { MyQueueItem, MyQueueResult } from "@/lib/types";

const apiError = (message: string) =>
  Object.assign(new Error("x"), { isAxiosError: true, response: { status: 409, data: { error: message } } });

beforeEach(() => {
  for (const fn of [get, post, patch, del]) fn.mockReset();
});

function queueItem(id: string, position: number, over: Partial<MyQueueItem> = {}): MyQueueItem {
  return {
    id,
    problemNumber: 1,
    status: "WAITING",
    position,
    scheduledAt: null,
    claimedByUserId: null,
    approvalStatus: "NOT_SUBMITTED",
    scores: [],
    school: {
      id: `school-${id}`,
      name: `โรงเรียน ${id}`,
      code: null,
      students: [{ id: `st-${id}`, studentCode: `1${id}`, seqNo: 1, name: "นักเรียน", schoolId: `school-${id}` }],
    },
    ...over,
  };
}

const queue = (items: MyQueueItem[], currentItemId: string | null = null, extra = {}): MyQueueResult => ({
  problemNumbers: [1],
  items,
  currentItemId,
  scoringLocked: false,
  updatedAt: "now",
  ...extra,
});

describe("StaffPage (F3)", () => {
  it("shows the lowest-position waiting item as next, and Call Next claims exactly that one", async () => {
    get.mockResolvedValue({ data: queue([queueItem("c", 5), queueItem("a", 1), queueItem("b", 3)]) });
    post.mockResolvedValue({});
    render(<StaffPage />);

    expect(await screen.findByText(/ถัดไป: โรงเรียน a · ข้อ 1/)).toBeInTheDocument();
    expect(screen.getByText("รอตรวจ (3)")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "เรียกคิวถัดไป" }));
    expect(post).toHaveBeenCalledWith("/queue/a/claim");
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2)); // reloads after the action
  });

  it("breaks position ties by problem number", async () => {
    get.mockResolvedValue({
      data: queue([queueItem("p2", 0, { problemNumber: 2 }), queueItem("p1", 0, { problemNumber: 1 })]),
    });
    render(<StaffPage />);
    expect(await screen.findByText(/ถัดไป: โรงเรียน p1/)).toBeInTheDocument();
  });

  it("disables Call Next when nothing is waiting", async () => {
    get.mockResolvedValue({ data: queue([]) });
    render(<StaffPage />);
    expect(await screen.findByRole("button", { name: "เรียกคิวถัดไป" })).toBeDisabled();
    expect(screen.getAllByText("ไม่มีรายการรอตรวจ").length).toBeGreaterThan(0);
  });

  it("with a held item: shows the score form plus Skip and Return, wired to the right endpoints", async () => {
    const held = queueItem("h", 0, { status: "IN_PROGRESS", claimedByUserId: "me" });
    get.mockResolvedValue({ data: queue([held, queueItem("w", 2)], "h") });
    post.mockResolvedValue({});
    render(<StaffPage />);

    await userEvent.click(await screen.findByRole("button", { name: "ข้ามคิว" }));
    expect(post).toHaveBeenLastCalledWith("/queue/h/skip");
    await userEvent.click(screen.getByRole("button", { name: "คืนคิว" }));
    expect(post).toHaveBeenLastCalledWith("/queue/h/release");
    expect(screen.getByRole("spinbutton")).toBeInTheDocument(); // ScoreForm for Mark Complete
    expect(screen.queryByRole("button", { name: "เรียกคิวถัดไป" })).toBeNull();
  });

  it("surfaces the backend error and reloads when an action fails", async () => {
    get.mockResolvedValue({ data: queue([queueItem("a", 0)]) });
    post.mockRejectedValue(apiError("มีคนรับคิวนี้ไปแล้ว"));
    render(<StaffPage />);
    await userEvent.click(await screen.findByRole("button", { name: "เรียกคิวถัดไป" }));
    expect(await screen.findByText("มีคนรับคิวนี้ไปแล้ว")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("shows a load error", async () => {
    get.mockRejectedValue(apiError("โหลดไม่ได้"));
    render(<StaffPage />);
    expect(await screen.findByText("โหลดไม่ได้")).toBeInTheDocument();
  });
});

describe("ScoreboardPage (F5)", () => {
  it("renders per-school rows with '-' for unscored problems and 2-dp sums", async () => {
    get.mockResolvedValue({
      data: [
        { schoolName: "A School", schoolCode: "A", problems: [10.5, null, 2, null, null], total: 12.5 },
        { schoolName: "B School", schoolCode: null, problems: [null, null, null, null, null], total: 0 },
      ],
    });
    render(<ScoreboardPage />);
    const row = (await screen.findByText("A School")).closest("tr")!;
    expect(within(row).getAllByRole("cell").map((c) => c.textContent)).toEqual([
      "A School", "10.50", "-", "2.00", "-", "-", "12.50",
    ]);
    expect(get).toHaveBeenCalledWith("/scoreboard");
    const bRow = screen.getByText("B School").closest("tr")!;
    expect(within(bRow).getAllByText("-")).toHaveLength(5);
  });

  it("shows an error message when loading fails", async () => {
    get.mockRejectedValue(apiError("ไม่มีสิทธิ์"));
    render(<ScoreboardPage />);
    expect(await screen.findByText("ไม่มีสิทธิ์")).toBeInTheDocument();
  });
});

describe("TeamLeaderApprovalsPage (F2)", () => {
  const report = { schoolName: "ศูนย์ A", rows: [], grandTotal: 0 };
  const route = (pending: unknown[]) =>
    get.mockImplementation(async (url: string) =>
      url === "/team-leader/report" ? { data: report } : { data: pending },
    );

  it("lists pending items and shows the school name", async () => {
    route([{ id: "p1", problemNumber: 2, schoolName: "ศูนย์ A" }]);
    render(<TeamLeaderApprovalsPage />);
    const button = await screen.findByRole("button", { name: "อนุมัติและลงนาม" });
    const li = button.closest("li")!;
    expect(within(li).getByText("ข้อ 2")).toBeInTheDocument();
    expect((await screen.findAllByText("ศูนย์ A")).length).toBeGreaterThan(0); // header subtitle
    expect(within(li).getByText("รออนุมัติ")).toBeInTheDocument(); // the badge, not the section title
  });

  it("approve posts, moves the item to the session's approved list with a PDF link, and reloads", async () => {
    let pending = [{ id: "p1", problemNumber: 2, schoolName: "ศูนย์ A" }];
    get.mockImplementation(async (url: string) =>
      url === "/team-leader/report" ? { data: report } : { data: pending },
    );
    post.mockImplementation(async () => {
      pending = [];
      return {};
    });
    render(<TeamLeaderApprovalsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "อนุมัติและลงนาม" }));
    expect(post).toHaveBeenCalledWith("/team-leader/approvals/p1/approve");

    expect(await screen.findByText("ไม่มีรายการรออนุมัติ")).toBeInTheDocument();
    expect(screen.getByText("อนุมัติแล้วในเซสชันนี้")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ดู PDF" })).toHaveAttribute(
      "href",
      "/api/bff/team-leader/approvals/p1/document",
    );
  });

  it("keeps the item pending and shows the backend error when approval fails (e.g. missing signature)", async () => {
    route([{ id: "p1", problemNumber: 2, schoolName: "ศูนย์ A" }]);
    post.mockRejectedValue(apiError("ต้องอัปโหลดลายเซ็นก่อน"));
    render(<TeamLeaderApprovalsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "อนุมัติและลงนาม" }));
    expect(await screen.findByText("ต้องอัปโหลดลายเซ็นก่อน")).toBeInTheDocument();
    expect(screen.queryByText("อนุมัติแล้วในเซสชันนี้")).toBeNull();
    expect(screen.getByRole("button", { name: "อนุมัติและลงนาม" })).toBeEnabled();
  });

  it("shows the empty state", async () => {
    route([]);
    render(<TeamLeaderApprovalsPage />);
    expect(await screen.findByText("ไม่มีรายการรออนุมัติ")).toBeInTheDocument();
  });
});

describe("AdminPermissionsPage (F4)", () => {
  const SCHOOL = { id: "sch-1", name: "ศูนย์ A", code: "A" };
  const rows = [
    { id: "c1", username: "committee1", displayName: "กรรมการ 1", role: "COMMITTEE", schoolId: null, hasSignature: true, assignments: [{ problemNumber: 1, schoolId: null }] },
    { id: "s1", username: "staff1", displayName: "เจ้าหน้าที่ 1", role: "STAFF", schoolId: null, hasSignature: false, assignments: [{ problemNumber: 2, schoolId: "sch-1" }] },
    { id: "t1", username: "leader1", displayName: "หัวหน้า 1", role: "TEAM_LEADER", schoolId: "sch-1", hasSignature: false, assignments: [] },
  ];

  beforeEach(() => {
    get.mockImplementation(async (url: string) =>
      url === "/admin/permissions" ? { data: rows } : { data: [SCHOOL] },
    );
  });

  it("filters by role tab and describes each user's scope", async () => {
    render(<AdminPermissionsPage />);
    expect(await screen.findByText("กรรมการ 1")).toBeInTheDocument();
    expect(screen.queryByText("เจ้าหน้าที่ 1")).toBeNull();
    expect(screen.getByText("ลายเซ็น ✓ (เปลี่ยน)")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "เจ้าหน้าที่" }));
    expect(await screen.findByText("ข้อ 2 (ศูนย์ A)")).toBeInTheDocument();
    expect(screen.getByText("อัปโหลดลายเซ็น")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "หัวหน้าทีม" }));
    expect(await screen.findByText("ศูนย์: ศูนย์ A")).toBeInTheDocument();
  });

  it("team leaders get signature upload only: no create form, edit or delete", async () => {
    render(<AdminPermissionsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "หัวหน้าทีม" }));
    await screen.findByText("หัวหน้า 1");
    expect(screen.queryByRole("button", { name: "แก้ไข" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ลบ" })).toBeNull();
    expect(screen.queryByRole("button", { name: "สร้างบัญชี" })).toBeNull();
  });

  it("creates a committee user: button stays disabled until valid, then posts problemNumbers", async () => {
    post.mockResolvedValue({});
    render(<AdminPermissionsPage />);
    await screen.findByText("กรรมการ 1");
    const create = screen.getByRole("button", { name: "สร้างบัญชี" });
    expect(create).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("username"), "new1");
    await userEvent.type(screen.getByPlaceholderText("ชื่อที่แสดง"), "ใหม่");
    await userEvent.type(screen.getByPlaceholderText("รหัสผ่าน (≥8 ตัว)"), "short");
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    expect(create).toBeDisabled(); // password too short

    await userEvent.clear(screen.getByPlaceholderText("รหัสผ่าน (≥8 ตัว)"));
    await userEvent.type(screen.getByPlaceholderText("รหัสผ่าน (≥8 ตัว)"), "password123");
    expect(create).toBeEnabled();
    await userEvent.click(create);

    expect(post).toHaveBeenCalledWith("/admin/committee", {
      username: "new1",
      displayName: "ใหม่",
      password: "password123",
      problemNumbers: [3],
    });
  });

  it("creates a STAFF user with (problem, school) rows sent as assignments", async () => {
    post.mockResolvedValue({});
    render(<AdminPermissionsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "เจ้าหน้าที่" }));
    await userEvent.type(screen.getByPlaceholderText("username"), "st2");
    await userEvent.type(screen.getByPlaceholderText("ชื่อที่แสดง"), "สต๊าฟ");
    await userEvent.type(screen.getByPlaceholderText("รหัสผ่าน (≥8 ตัว)"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "+ เพิ่มข้อ/ศูนย์" }));

    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "4");
    await userEvent.selectOptions(selects[1], "sch-1");
    await userEvent.click(screen.getByRole("button", { name: "สร้างบัญชี" }));

    expect(post).toHaveBeenCalledWith("/admin/staff", {
      username: "st2",
      displayName: "สต๊าฟ",
      password: "password123",
      assignments: [{ problemNumber: 4, schoolId: "sch-1" }],
    });
  });

  it("edits a STAFF scope via PATCH /admin/staff and deletes after confirmation", async () => {
    patch.mockResolvedValue({});
    del.mockResolvedValue({});
    render(<AdminPermissionsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "เจ้าหน้าที่" }));
    await userEvent.click(await screen.findByRole("button", { name: "แก้ไข" }));
    await userEvent.selectOptions(screen.getAllByRole("combobox")[1], ""); // -> all schools
    await userEvent.click(screen.getByRole("button", { name: "บันทึก" }));
    expect(patch).toHaveBeenCalledWith("/admin/staff", {
      id: "s1",
      assignments: [{ problemNumber: 2, schoolId: null }],
      password: undefined,
    });

    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    await userEvent.click(await screen.findByRole("button", { name: "ลบ" }));
    expect(del).not.toHaveBeenCalled(); // cancelled
    await userEvent.click(screen.getByRole("button", { name: "ลบ" }));
    expect(del).toHaveBeenCalledWith("/admin/staff", { params: { id: "s1" } });
    confirm.mockRestore();
  });

  it("uploads a signature as multipart to /admin/users/:id/signature", async () => {
    post.mockResolvedValue({});
    const { container } = render(<AdminPermissionsPage />);
    await screen.findByText("กรรมการ 1");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], "sig.png", { type: "image/png" });
    await userEvent.upload(input, file);

    await waitFor(() => expect(post).toHaveBeenCalled());
    const [url, body] = post.mock.calls[0];
    expect(url).toBe("/admin/users/c1/signature");
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("shows the backend error when creating fails", async () => {
    post.mockRejectedValue(apiError("ชื่อผู้ใช้นี้มีอยู่แล้ว"));
    render(<AdminPermissionsPage />);
    await screen.findByText("กรรมการ 1");
    await userEvent.type(screen.getByPlaceholderText("username"), "dup");
    await userEvent.type(screen.getByPlaceholderText("ชื่อที่แสดง"), "x");
    await userEvent.type(screen.getByPlaceholderText("รหัสผ่าน (≥8 ตัว)"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "1" }));
    await userEvent.click(screen.getByRole("button", { name: "สร้างบัญชี" }));
    expect(await screen.findByText("ชื่อผู้ใช้นี้มีอยู่แล้ว")).toBeInTheDocument();
  });
});
