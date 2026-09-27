import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
  },
}));
vi.mock("@/lib/use-queue-stream", () => ({ useQueueStream: vi.fn() }));

import EditRequestsPage from "./team-leader/score-edit-requests/page";
import CommitteePage from "./committee/page";
import type { MyQueueItem, MyQueueResult } from "@/lib/types";

beforeEach(() => {
  for (const fn of [get, post, patch]) fn.mockReset();
});

const request = (id: string, status: "PENDING" | "APPROVED" | "REJECTED") => ({
  id,
  oldValue: 5,
  newValue: 8,
  reason: "นับขั้นตอนไม่ครบ",
  status,
  schoolName: "ศูนย์ A",
  studentName: "นักเรียน",
  studentCode: "1A",
  problemNumber: 3,
  requestedByDisplayName: "กรรมการ 1",
  createdAt: "2026-01-01T00:00:00Z",
});

describe("Team leader score-edit-requests page (moved off /admin in B3)", () => {
  it("loads from the team-leader endpoint and splits pending vs resolved", async () => {
    get.mockResolvedValue({ data: [request("r1", "PENDING"), request("r2", "APPROVED"), request("r3", "REJECTED")] });
    render(<EditRequestsPage />);

    expect(await screen.findByText("เหตุผล: นับขั้นตอนไม่ครบ")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/team-leader/score-edit-requests");
    expect(screen.getAllByRole("button", { name: "อนุมัติ" })).toHaveLength(1); // only the pending one
    expect(screen.getByText("อนุมัติแล้ว")).toBeInTheDocument();
    expect(screen.getByText("ปฏิเสธแล้ว")).toBeInTheDocument();
  });

  it("approve / reject PATCH the right URL with the action, then reload", async () => {
    get.mockResolvedValue({ data: [request("r1", "PENDING")] });
    patch.mockResolvedValue({});
    render(<EditRequestsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "อนุมัติ" }));
    expect(patch).toHaveBeenLastCalledWith("/team-leader/score-edit-requests/r1", { action: "approve" });
    await userEvent.click(screen.getByRole("button", { name: "ปฏิเสธ" }));
    expect(patch).toHaveBeenLastCalledWith("/team-leader/score-edit-requests/r1", { action: "reject" });
    await waitFor(() => expect(get.mock.calls.length).toBeGreaterThanOrEqual(3));
  });

  it("shows an empty state", async () => {
    get.mockResolvedValue({ data: [] });
    render(<EditRequestsPage />);
    expect(await screen.findByText("ไม่มีคำขอค้างดำเนินการ")).toBeInTheDocument();
  });
});

function item(id: string, over: Partial<MyQueueItem> = {}): MyQueueItem {
  return {
    id,
    problemNumber: 1,
    status: "WAITING",
    position: 0,
    scheduledAt: null,
    claimedByUserId: null,
    approvalStatus: "NOT_SUBMITTED",
    scores: [],
    school: {
      id: `s-${id}`,
      name: `โรงเรียน ${id}`,
      code: null,
      students: [{ id: `st-${id}`, studentCode: "1", seqNo: 1, name: "น", schoolId: `s-${id}` }],
    },
    ...over,
  };
}
const q = (items: MyQueueItem[], currentItemId: string | null = null, scoringLocked = false): MyQueueResult => ({
  problemNumbers: [1],
  items,
  currentItemId,
  scoringLocked,
  awaitingApproval: false,
  updatedAt: "now",
});

describe("Committee page", () => {
  it("claims a waiting item; claim buttons are disabled while holding another item", async () => {
    get.mockResolvedValue({ data: q([item("w")]) });
    post.mockResolvedValue({});
    render(<CommitteePage />);
    await userEvent.click(await screen.findByRole("button", { name: "รับตรวจ" }));
    expect(post).toHaveBeenCalledWith("/queue/w/claim");
  });

  it("disables 'รับตรวจ' while holding an item, and Return releases it", async () => {
    get.mockResolvedValue({
      data: q([item("h", { status: "IN_PROGRESS", claimedByUserId: "me" }), item("w")], "h"),
    });
    post.mockResolvedValue({});
    render(<CommitteePage />);
    expect(await screen.findByRole("button", { name: "รับตรวจ" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "คืนคิว" }));
    expect(post).toHaveBeenCalledWith("/queue/h/release");
  });

  it("done list shows PENDING_APPROVAL vs APPROVED badges from approvalStatus", async () => {
    get.mockResolvedValue({
      data: q([
        item("d1", { status: "DONE", approvalStatus: "PENDING" }),
        item("d2", { status: "DONE", approvalStatus: "APPROVED" }),
      ]),
    });
    render(<CommitteePage />);
    const li1 = (await screen.findByText("โรงเรียน d1")).closest("li")!;
    const li2 = screen.getByText("โรงเรียน d2").closest("li")!;
    expect(within(li1).getByText("รออนุมัติ")).toBeInTheDocument();
    expect(within(li2).getByText("อนุมัติแล้ว")).toBeInTheDocument();
  });

  it("when scoring is locked, tells the user to use edit requests", async () => {
    get.mockResolvedValue({ data: q([], null, true) });
    render(<CommitteePage />);
    expect(await screen.findByText(/ปิดรับคะแนนแล้ว/)).toBeInTheDocument();
  });
});
