import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import AdminQueuePage from "./page";

const apiError = (message: string) =>
  Object.assign(new Error("x"), { isAxiosError: true, response: { status: 409, data: { error: message } } });

/** Same flat shape the real GET /admin/queue returns (schoolName, not school.name). */
const item = (id: string, problemNumber: number, scheduledAt: string | null = null) => ({
  id,
  problemNumber,
  status: "WAITING",
  position: 10,
  scheduledAt,
  schoolId: `s-${id}`,
  schoolName: `School ${id}`,
  schoolCode: id.toUpperCase(),
});

function mockList(items: unknown[]) {
  get.mockImplementation(async (url: string) =>
    url === "/admin/queue" ? { data: items } : { data: [] },
  );
}

const generateButton = () => screen.getByRole("button", { name: "สร้างตารางคิว" });

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
  vi.restoreAllMocks();
});

describe("Admin queue page: generate rotation schedule", () => {
  it("defaults the date to today (Bangkok) and posts it to /admin/queue/generate after confirmation", async () => {
    mockList([]);
    post.mockResolvedValue({ data: { created: 80, updated: 0, total: 80 } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminQueuePage />);

    const date = (await screen.findByLabelText("วันที่จัดตาราง")) as HTMLInputElement;
    expect(date.value).toBe(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }));

    await userEvent.click(generateButton());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/admin/queue/generate", { date: date.value, startTime: "13:30", slotMinutes: 15 });
    expect(await screen.findByText(/เพิ่มใหม่ 80 รายการ · จัดเวลาใหม่ 0 รายการ \(รวม 80\)/)).toBeInTheDocument();
  });

  it("sends the chosen date, and reloads the queue list afterwards", async () => {
    mockList([]);
    post.mockResolvedValue({ data: { created: 80, updated: 0, total: 80 } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminQueuePage />);

    const date = await screen.findByLabelText("วันที่จัดตาราง");
    await userEvent.clear(date);
    await userEvent.type(date, "2026-05-17");
    const loadsBefore = get.mock.calls.length;
    await userEvent.click(generateButton());

    expect(post).toHaveBeenCalledWith("/admin/queue/generate", { date: "2026-05-17", startTime: "13:30", slotMinutes: 15 });
    await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(loadsBefore));
  });

  it("warns about existing items in the confirmation and does nothing when cancelled", async () => {
    mockList([item("a", 1), item("b", 1)]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminQueuePage />);
    await screen.findByText("School a");

    await userEvent.click(generateButton());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(String(confirm.mock.calls[0][0])).toContain("2 รายการ");
    expect(String(confirm.mock.calls[0][0])).toContain("จัดเวลาและลำดับใหม่");
    expect(post).not.toHaveBeenCalled();
  });

  it("shows the backend's refusal near the button (e.g. examining already started) and no success notice", async () => {
    mockList([]);
    post.mockRejectedValue(apiError("มีรายการที่ถูกรับตรวจหรือตรวจเสร็จแล้ว"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminQueuePage />);
    await userEvent.click(await screen.findByRole("button", { name: "สร้างตารางคิว" }));

    expect(await screen.findByText("มีรายการที่ถูกรับตรวจหรือตรวจเสร็จแล้ว")).toBeInTheDocument();
    expect(screen.queryByText(/สร้างตารางคิวแล้ว/)).toBeNull();
    expect(generateButton()).toBeEnabled(); // can retry
  });

  it("disables the button without a date", async () => {
    mockList([]);
    render(<AdminQueuePage />);
    const date = await screen.findByLabelText("วันที่จัดตาราง");
    await userEvent.clear(date);
    expect(generateButton()).toBeDisabled();
  });
});

describe("Admin queue page: list rendering (regression: crashed on `item.school.name`)", () => {
  it("renders rows from the flat backend shape, with the Bangkok time (or '-' when unscheduled)", async () => {
    mockList([item("a", 1, "2026-05-17T06:30:00.000Z"), item("b", 2, null)]);
    render(<AdminQueuePage />);
    const rowA = (await screen.findByText("School a")).closest("tr")!;
    expect(rowA).toHaveTextContent("13:30");
    const rowB = screen.getByText("School b").closest("tr")!;
    expect(rowB).toHaveTextContent("-");
  });
});

describe("Admin queue page: claim directly from the table", () => {
  it("claims a WAITING row and navigates to /staff to grade it", async () => {
    mockList([item("a", 3)]);
    post.mockResolvedValue({});
    render(<AdminQueuePage />);

    const row = (await screen.findByText("School a")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "รับตรวจ" }));

    expect(post).toHaveBeenCalledWith("/queue/a/claim");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/staff"));
  });

  it("shows the backend's refusal and stays on the page when claim fails", async () => {
    mockList([item("a", 3)]);
    post.mockRejectedValue(apiError("รายการนี้ถูกกรรมการท่านอื่นรับตรวจไปแล้ว"));
    render(<AdminQueuePage />);

    const row = (await screen.findByText("School a")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "รับตรวจ" }));

    expect(await screen.findByText("รายการนี้ถูกกรรมการท่านอื่นรับตรวจไปแล้ว")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a link to jump back into grading the item this admin already holds", async () => {
    get.mockImplementation(async (url: string) => {
      if (url === "/admin/queue") return { data: [{ ...item("a", 1), status: "IN_PROGRESS", claimedByUserId: "me" }] };
      if (url === "/auth/me") return { data: { id: "me" } };
      return { data: [] };
    });
    render(<AdminQueuePage />);

    const row = (await screen.findByText("School a")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "ไปตรวจคะแนน" }));
    expect(push).toHaveBeenCalledWith("/staff");
  });
});

// These three mirror the "เพิ่ม/แก้ไข/ลบ" branches of the queue-management
// flow diagram: a themed confirm dialog (not window.confirm) gates the save,
// and a success message is shown once the database write completes.
describe("Admin queue page: add item via confirm modal", () => {
  function mockListAndSchools(items: unknown[], schools: unknown[]) {
    get.mockImplementation(async (url: string) => {
      if (url === "/admin/queue") return { data: items };
      if (url === "/admin/schools") return { data: schools };
      return { data: [] };
    });
  }

  it("requires a school to be chosen before the add button is enabled", async () => {
    mockListAndSchools([], [{ id: "sch-1", name: "School One" }]);
    render(<AdminQueuePage />);
    await screen.findByRole("option", { name: "School One" });
    expect(screen.getByRole("button", { name: "เพิ่มรายการ" })).toBeDisabled();
  });

  it("shows a confirm dialog naming the school and problem, then posts and shows a success message", async () => {
    mockListAndSchools([], [{ id: "sch-1", name: "School One" }]);
    post.mockResolvedValue({ data: { item: {} } });
    render(<AdminQueuePage />);

    const schoolSelect = (await screen.findAllByRole("combobox"))[0];
    await userEvent.selectOptions(schoolSelect, "sch-1");
    await userEvent.click(screen.getByRole("button", { name: "เพิ่มรายการ" }));

    expect(await screen.findByText(/School One ข้อที่ 1 ใช่หรือไม่/)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(post).toHaveBeenCalledWith("/admin/queue", { schoolId: "sch-1", problemNumber: 1 });
    expect(await screen.findByText("เพิ่มรายการคิวสำเร็จ")).toBeInTheDocument();
  });

  it("does not post when the add confirmation is cancelled", async () => {
    mockListAndSchools([], [{ id: "sch-1", name: "School One" }]);
    render(<AdminQueuePage />);

    const schoolSelect = (await screen.findAllByRole("combobox"))[0];
    await userEvent.selectOptions(schoolSelect, "sch-1");
    await userEvent.click(screen.getByRole("button", { name: "เพิ่มรายการ" }));
    await userEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByText(/ใช่หรือไม่/)).toBeNull();
  });
});

describe("Admin queue page: full edit (school/problem/time) via confirm modal", () => {
  function mockListAndSchools(items: unknown[], schools: unknown[]) {
    get.mockImplementation(async (url: string) => {
      if (url === "/admin/queue") return { data: items };
      if (url === "/admin/schools") return { data: schools };
      return { data: [] };
    });
  }

  // With schools seeded, "School a" also appears as an <option> in the Add
  // section's dropdown — findByText alone would match both, so pick the
  // match that sits inside a table row.
  async function findRow(text: string) {
    const matches = await screen.findAllByText(text);
    const row = matches.map((el) => el.closest("tr")).find((tr): tr is HTMLTableRowElement => !!tr);
    if (!row) throw new Error(`No table row found containing "${text}"`);
    return row;
  }

  it("pre-fills the current school/problem/time, shows a confirm dialog, then patches everything and shows a success message", async () => {
    mockListAndSchools(
      [item("a", 1, "2026-05-17T06:30:00.000Z")],
      [{ id: "s-a", name: "School a" }, { id: "s-b", name: "School b" }],
    );
    patch.mockResolvedValue({});
    render(<AdminQueuePage />);

    const row = await findRow("School a");
    await userEvent.click(within(row).getByRole("button", { name: "แก้ไข" }));

    const schoolSelect = within(row).getByLabelText("โรงเรียน") as HTMLSelectElement;
    const problemSelect = within(row).getByLabelText("ข้อ") as HTMLSelectElement;
    expect(schoolSelect.value).toBe("s-a");
    expect(problemSelect.value).toBe("1");

    await userEvent.selectOptions(schoolSelect, "s-b");
    await userEvent.selectOptions(problemSelect, "2");
    await userEvent.click(within(row).getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText(/School b ข้อที่ 2 เวลา 2026-05-17 13:30/)).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(patch).toHaveBeenCalledWith("/admin/queue/a", {
      schoolId: "s-b",
      problemNumber: 2,
      date: "2026-05-17",
      time: "13:30",
    });
    expect(await screen.findByText("แก้ไขรายการคิวสำเร็จ")).toBeInTheDocument();
  });

  it("does not patch when the edit confirmation is cancelled", async () => {
    mockListAndSchools([item("a", 1, "2026-05-17T06:30:00.000Z")], [{ id: "s-a", name: "School a" }]);
    render(<AdminQueuePage />);

    const row = await findRow("School a");
    await userEvent.click(within(row).getByRole("button", { name: "แก้ไข" }));
    await userEvent.click(within(row).getByRole("button", { name: "บันทึก" }));
    // Two "ยกเลิก" buttons exist now: the row's own cancel-edit button, and the
    // confirm modal's — the modal's is rendered last in the component tree.
    const cancelButtons = await screen.findAllByRole("button", { name: "ยกเลิก" });
    await userEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(patch).not.toHaveBeenCalled();
  });
});

describe("Admin queue page: delete item via confirm modal", () => {
  it("shows a themed confirm dialog (not window.confirm) naming the school and problem, then deletes on confirm", async () => {
    mockList([item("a", 4)]);
    del.mockResolvedValue({});
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<AdminQueuePage />);

    const row = (await screen.findByText("School a")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "ลบ" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByText(/School a ข้อที่ 4/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(del).toHaveBeenCalledWith("/admin/queue", { params: { id: "a" } });
    expect(await screen.findByText("ลบรายการคิวสำเร็จ")).toBeInTheDocument();
  });

  it("does not delete when the delete confirmation is cancelled", async () => {
    mockList([item("a", 4)]);
    render(<AdminQueuePage />);

    const row = (await screen.findByText("School a")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "ลบ" }));
    await userEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(del).not.toHaveBeenCalled();
  });
});

describe("Admin queue page: reset queue (danger zone)", () => {
  it("keeps the confirm button disabled until \"RESET\" is typed, then posts and shows the counts", async () => {
    mockList([]);
    post.mockResolvedValue({ data: { scoresDeleted: 12, editRequestsDeleted: 3, queueItemsRewound: 80 } });
    render(<AdminQueuePage />);

    await userEvent.click(await screen.findByRole("button", { name: "ล้างคิว" }));
    const confirmButton = screen.getByRole("button", { name: "ยืนยัน" });
    expect(confirmButton).toBeDisabled();

    const typedField = screen.getByLabelText("พิมพ์ RESET เพื่อยืนยัน");
    await userEvent.type(typedField, "wrong");
    expect(confirmButton).toBeDisabled();

    await userEvent.clear(typedField);
    await userEvent.type(typedField, "RESET");
    expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);
    expect(post).toHaveBeenCalledWith("/admin/queue/reset");
    expect(
      await screen.findByText("ล้างคิวสำเร็จ: ลบคะแนน 12 รายการ · ลบคำขอแก้ไข 3 รายการ · รีเซ็ตคิว 80 รายการ"),
    ).toBeInTheDocument();
  });

  it("does not post when the reset confirmation is cancelled", async () => {
    mockList([]);
    render(<AdminQueuePage />);

    await userEvent.click(await screen.findByRole("button", { name: "ล้างคิว" }));
    await userEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(post).not.toHaveBeenCalled();
  });

  it("shows the backend's refusal (e.g. blocked in production) and no success notice", async () => {
    mockList([]);
    post.mockRejectedValue(apiError("ปิดใช้งานการล้างคิวในสภาพแวดล้อม production"));
    render(<AdminQueuePage />);

    await userEvent.click(await screen.findByRole("button", { name: "ล้างคิว" }));
    const typedField = screen.getByLabelText("พิมพ์ RESET เพื่อยืนยัน");
    await userEvent.type(typedField, "RESET");
    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));

    expect(await screen.findByText("ปิดใช้งานการล้างคิวในสภาพแวดล้อม production")).toBeInTheDocument();
    expect(screen.queryByText(/ล้างคิวสำเร็จ/)).toBeNull();
  });
});
