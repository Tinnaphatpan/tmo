import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicQueueResult, QueueSlot } from "@/lib/types";
import {
  QueueBoardTable,
  boardBanner,
  buildBoardRows,
  formatBoardDate,
  formatBoardTime,
} from "./QueueBoardTable";
import type { PublicQueueItem } from "@/lib/types";

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

/** Same wiring as the page: rows + banner derived from slots/items. */
function Board({ slots: s, items = [] }: { slots: QueueSlot[]; items?: PublicQueueItem[] }) {
  return (
    <QueueBoardTable
      rows={buildBoardRows({ slots: s, items })}
      problemNumbers={[1, 2]}
      banner={boardBanner(s)}
    />
  );
}

describe("QueueBoardTable", () => {
  it("renders the slot/problem headers and the session banner", () => {
    render(<Board slots={slots} />);
    expect(screen.getByText(/ตั้งต้น/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ข้อ 1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ข้อ 2" })).toBeInTheDocument();
    const banner = screen.getByText(/การทวนสอบวันแรก/);
    expect(banner).toHaveAttribute("colspan", "3"); // slot column + 2 problems
    expect(banner).toHaveTextContent("13:30 - 17:30 น.");
  });

  it("each cell shows the school code (bold) and the slot time; the row starts with the time", () => {
    render(<Board slots={slots} />);
    const row = screen.getByText("CMU").closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("13:30");
    expect(cells[1]).toHaveTextContent("CMU");
    expect(cells[1]).toHaveTextContent("13:30");
    expect(within(cells[1]).getByText("CMU").className).toContain("font-bold");
    expect(cells[2]).toHaveTextContent("BUU13:30");
  });

  it("highlights only IN_PROGRESS cells and mutes DONE ones", () => {
    const { container } = render(<Board slots={slots} />);
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
    render(<Board slots={slots} />);
    expect(screen.getByText("School null")).toBeInTheDocument();
    const lastRow = screen.getByText("RS").closest("tr")!;
    expect(within(lastRow).getAllByRole("cell")[2]).toHaveTextContent("-");
    expect(within(lastRow).getAllByRole("cell")[0]).toHaveTextContent("17:15");
  });

  it("renders no banner and no rows for an empty schedule", () => {
    render(<Board slots={[]} />);
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

  it("shows unscheduled items instead of an empty page (the real-DB case: 5 waiting items, no times)", async () => {
    usePublicQueue.mockReturnValue(
      data({
        slots: [],
        problemNumbers: [1],
        items: [10, 20, 30, 40, 50].map((position, i) => ({
          id: `i${i}`,
          problemNumber: 1,
          position,
          status: "WAITING" as const,
          scheduledAt: null,
          school: { id: `s${i}`, name: `S${i}`, code: `CODE${i}` },
        })),
      }),
    );
    const { default: Page } = await import("@/app/queue/page");
    render(<Page />);
    expect(screen.queryByText("ยังไม่มีตารางคิว")).toBeNull();
    expect(screen.getByText("CODE0")).toBeInTheDocument();
    expect(screen.getByText("CODE4")).toBeInTheDocument();
    expect(screen.getByText("คิวที่ 5")).toBeInTheDocument();
  });

  it("loading and empty states", async () => {
    const { default: Page } = await import("@/app/queue/page");
    usePublicQueue.mockReturnValue(null);
    const { unmount } = render(<Page />);
    expect(screen.getByText("กำลังโหลด...")).toBeInTheDocument();
    unmount();

    usePublicQueue.mockReturnValue(data({ slots: [], items: [] }));
    render(<Page />);
    expect(screen.getByText("ยังไม่มีตารางคิว")).toBeInTheDocument();
  });
});

const item = (id: string, problemNumber: number, position: number, code: string, status: PublicQueueItem["status"] = "WAITING", scheduledAt: string | null = null): PublicQueueItem => ({
  id,
  problemNumber,
  position,
  status,
  scheduledAt,
  school: school(code),
});

describe("items without a scheduled time (e.g. data migrated from the old system)", () => {
  it("buildBoardRows lines them up by queue position: the n-th item of each problem is row 'คิวที่ n'", () => {
    const rows = buildBoardRows({
      slots: [],
      items: [
        item("p1-b", 1, 20, "MWIT"),
        item("p1-a", 1, 10, "AFAPS"),
        item("p2-a", 2, 5, "CMU"),
      ],
    });
    expect(rows.map((r) => r.label)).toEqual(["คิวที่ 1", "คิวที่ 2"]);
    expect(rows[0].cells.map((c) => c.school.code).sort()).toEqual(["AFAPS", "CMU"]);
    expect(rows[1].cells.map((c) => c.school.code)).toEqual(["MWIT"]);
    expect(rows.every((r) => r.time === null)).toBe(true);
  });

  it("renders the code with no time line, highlights in-progress, and shows '-' where a problem has no item", () => {
    const { container } = render(
      <Board
        slots={[]}
        items={[item("a", 1, 10, "AFAPS", "IN_PROGRESS"), item("b", 1, 20, "MWIT")]}
      />,
    );
    const first = screen.getByText("AFAPS").closest("tr")!;
    expect(within(first).getAllByRole("cell")[0]).toHaveTextContent("คิวที่ 1");
    expect(first).not.toHaveTextContent(/\d{2}:\d{2}/);
    expect(container.querySelector('td[data-status="IN_PROGRESS"]')).toHaveTextContent("AFAPS");
    expect(within(first).getAllByRole("cell")[2]).toHaveTextContent("-"); // problem 2 empty
    expect(screen.queryByText(/การทวนสอบวันแรก/)).toBeNull(); // no slots -> no time banner
  });

  it("scheduled slots come first, unscheduled items follow, and scheduled items are not duplicated", () => {
    const scheduled = item("x", 1, 1, "CMU", "WAITING", at(13, 30));
    const rows = buildBoardRows({ slots: [slots[0]], items: [scheduled, item("u", 2, 1, "BUU")] });
    expect(rows.map((r) => r.label)).toEqual(["13:30", "คิวที่ 1"]);
    expect(rows[1].cells.map((c) => c.school.code)).toEqual(["BUU"]);
  });
});
