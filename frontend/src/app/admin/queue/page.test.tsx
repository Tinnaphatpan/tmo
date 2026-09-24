import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: vi.fn(),
    delete: vi.fn(),
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
    expect(post).toHaveBeenCalledWith("/admin/queue/generate", { date: date.value });
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

    expect(post).toHaveBeenCalledWith("/admin/queue/generate", { date: "2026-05-17" });
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
