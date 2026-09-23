import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicQueueResult, QueueSlot } from "@/lib/types";
import { QueueBoardTable, boardBanner, formatBoardDate, formatBoardTime } from "./QueueBoardTable";

// 2026-05-17 13:30 Asia/Bangkok == 06:30Z (the printed schedule's first slot).
const at = (h: number, m: number) => new Date(Date.UTC(2026, 4, 17, h - 7, m)).toISOString();

const school = (code: string | null, name = `School ${code}`) => ({ id: code ?? name, name, code });
const cell = (id: string, problemNumber: number, code: string | null, status: "WAITING" | "IN_PROGRESS" | "DONE") => ({
  id,
  problemNumber,
  school: school(code),
  status,
});

const slots: QueueSlot[] = [
  { startsAt: at(13, 30), cells: [cell("a", 1, "CMU", "DONE"), cell("b", 2, "BUU", "WAITING")] },
  { startsAt: at(13, 45), cells: [cell("c", 1, "KKU", "IN_PROGRESS"), cell("d", 2, null, "WAITING")] },
  { startsAt: at(17, 15), cells: [cell("e", 1, "RS", "WAITING")] },
];

describe("board formatting (Asia/Bangkok, Buddhist year)", () => {
  it("formats times as HH:mm and dates in Thai with the Buddhist year", () => {
    expect(formatBoardTime(at(13, 30))).toBe("13:30");
    expect(formatBoardTime(at(9, 5))).toBe("09:05");
    expect(formatBoardDate(at(13, 30))).toBe("17 พฤษภาคม 2569");
  });

  it("banner spans the first slot start to the last slot start + 15 minutes", () => {
    expect(boardBanner(slots)).toBe("13:30 - 17:30 น.: การทวนสอบวันแรก (17 พฤษภาคม 2569)");
    expect(boardBanner([])).toBeNull();
  });
});

describe("QueueBoardTable", () => {
  it("renders the slot/problem headers and the session banner", () => {
    render(<QueueBoardTable slots={slots} problemNumbers={[1, 2]} />);
    expect(screen.getByText(/ตั้งต้น/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ข้อ 1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ข้อ 2" })).toBeInTheDocument();
    const banner = screen.getByText(/การทวนสอบวันแรก/);
    expect(banner).toHaveAttribute("colspan", "3"); // slot column + 2 problems
    expect(banner).toHaveTextContent("13:30 - 17:30 น.");
  });

  it("each cell shows the school code (bold) and the slot time; the row starts with the time", () => {
    render(<QueueBoardTable slots={slots} problemNumbers={[1, 2]} />);
    const row = screen.getByText("CMU").closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("13:30");
    expect(cells[1]).toHaveTextContent("CMU");
    expect(cells[1]).toHaveTextContent("13:30");
    expect(within(cells[1]).getByText("CMU").className).toContain("font-bold");
    expect(cells[2]).toHaveTextContent("BUU13:30");
  });

  it("highlights only IN_PROGRESS cells and mutes DONE ones", () => {
    const { container } = render(<QueueBoardTable slots={slots} problemNumbers={[1, 2]} />);
    const byStatus = (s: string) => [...container.querySelectorAll(`td[data-status="${s}"]`)];
    const active = byStatus("IN_PROGRESS");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent("KKU");
    expect(active[0].className).toContain("bg-[var(--qb-active)]");
    for (const td of [...byStatus("WAITING"), ...byStatus("DONE")]) {
      expect(td.className).not.toContain("bg-[var(--qb-active)]");
    }
    expect(within(byStatus("DONE")[0] as HTMLElement).getByText("CMU").parentElement!.className).toContain(
      "text-[var(--qb-done)]",
    );
  });

  it("falls back to the school name when there is no code, and '-' for a missing cell", () => {
    render(<QueueBoardTable slots={slots} problemNumbers={[1, 2]} />);
    expect(screen.getByText("School null")).toBeInTheDocument();
    const lastRow = screen.getByText("RS").closest("tr")!;
    expect(within(lastRow).getAllByRole("cell")[2]).toHaveTextContent("-");
    expect(within(lastRow).getAllByRole("cell")[0]).toHaveTextContent("17:15");
  });

  it("renders no banner and no rows for an empty schedule", () => {
    render(<QueueBoardTable slots={[]} problemNumbers={[1, 2]} />);
    expect(screen.queryByText(/การทวนสอบวันแรก/)).toBeNull();
    expect(screen.queryAllByRole("cell")).toHaveLength(0);
  });
});

const usePublicQueue = vi.fn<() => PublicQueueResult | null>();
vi.mock("@/lib/use-public-queue", () => ({ usePublicQueue: () => usePublicQueue() }));

describe("/queue page", () => {
  beforeEach(() => usePublicQueue.mockReset());

  const data = (over: Partial<PublicQueueResult> = {}): PublicQueueResult => ({
    items: [],
    counts: { waiting: 3, inProgress: 1, done: 1, total: 5 },
    problemNumbers: [1, 2],
    byProblem: [],
    slots,
    scheduleDate: at(13, 30),
    updatedAt: "now",
    ...over,
  });

  it("shows the title, the board, the counts and the CSV link", async () => {
    usePublicQueue.mockReturnValue(data());
    const { default: Page } = await import("@/app/queue/page");
    render(<Page />);
    expect(screen.getByText("TMO Queue Board")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ภาพรวมคิวทั้งหมด" })).toBeInTheDocument();
    expect(screen.getByText("KKU")).toBeInTheDocument();
    expect(screen.getByText(/รอตรวจ 3 · กำลังตรวจ 1 · ตรวจแล้ว 1 จากทั้งหมด 5/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ดาวน์โหลดตารางเวลา/ })).toHaveAttribute("href", "/api/bff/schedule/export");
  });

  it("loading and empty states", async () => {
    const { default: Page } = await import("@/app/queue/page");
    usePublicQueue.mockReturnValue(null);
    const { unmount } = render(<Page />);
    expect(screen.getByText("กำลังโหลด...")).toBeInTheDocument();
    unmount();

    usePublicQueue.mockReturnValue(data({ slots: [] }));
    render(<Page />);
    expect(screen.getByText("ยังไม่มีตารางคิว")).toBeInTheDocument();
  });
});
