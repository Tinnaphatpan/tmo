import { useT } from "@/lib/i18n";
import { SchoolLogo } from "@/components/SchoolLogo";
import type {
  PublicQueueItem,
  PublicQueueResult,
  QueueSlot,
  QueueSlotCell,
} from "@/lib/types";

const TZ = "Asia/Bangkok";
const SLOT_MINUTES = 15;
/** First-day label of the verification session (matches the printed schedule). */
export const BOARD_SESSION_LABEL = "การทวนสอบวันแรก";

/** "13:30" — en-GB gives a stable HH:mm regardless of the Thai locale's separator. */
export function formatBoardTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** "17 พฤษภาคม 2569" (Buddhist year). */
export function formatBoardDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}

/** "13:30 - 17:30 น.: การทวนสอบวันแรก (17 พฤษภาคม 2569)" from the first/last slot. */
export function boardBanner(slots: QueueSlot[]): string | null {
  if (slots.length === 0) return null;
  const first = slots[0].startsAt;
  const last = new Date(slots[slots.length - 1].startsAt);
  const end = new Date(last.getTime() + SLOT_MINUTES * 60_000);
  return `${formatBoardTime(first)} - ${formatBoardTime(end)} น.: ${BOARD_SESSION_LABEL} (${formatBoardDate(first)})`;
}

export interface BoardRow {
  key: string;
  /** First-column text: the slot time, or "คิวที่ n" for items without a time. */
  label: string;
  /** Time printed under each school code; null for unscheduled rows. */
  time: string | null;
  cells: QueueSlotCell[];
}

const toCell = (item: PublicQueueItem): QueueSlotCell => ({
  id: item.id,
  problemNumber: item.problemNumber,
  school: item.school,
  status: item.status,
});

/**
 * Rows for the board: every scheduled slot (by time), then — so the page is
 * never empty when a queue was created without times (e.g. data migrated from
 * the old system) — the unscheduled items lined up by queue position, the
 * n-th waiting item of each problem forming row "คิวที่ n".
 */
export function buildBoardRows(
  data: Pick<PublicQueueResult, "slots" | "items">,
): BoardRow[] {
  const rows: BoardRow[] = data.slots.map((slot) => {
    const time = formatBoardTime(slot.startsAt);
    return { key: slot.startsAt, label: time, time, cells: slot.cells };
  });

  const byProblem = new Map<number, PublicQueueItem[]>();
  for (const item of data.items.filter((i) => !i.scheduledAt)) {
    byProblem.set(item.problemNumber, [
      ...(byProblem.get(item.problemNumber) ?? []),
      item,
    ]);
  }
  const lists = [...byProblem.values()].map((l) =>
    l.sort((a, b) => a.position - b.position),
  );
  const depth = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < depth; i++) {
    rows.push({
      key: `unscheduled-${i}`,
      label: `คิวที่ ${i + 1}`,
      time: null,
      cells: lists.filter((l) => l[i]).map((l) => toCell(l[i])),
    });
  }
  return rows;
}

/**
 * Whole-schedule overview: one row per start slot, one column per problem;
 * each cell shows the school code and its time. The cell being examined right
 * now (IN_PROGRESS) is highlighted; finished cells are muted.
 */
export function QueueBoardTable({
  rows,
  problemNumbers,
  banner,
}: {
  rows: BoardRow[];
  problemNumbers: number[];
  banner?: string | null;
}) {
  const t = useT();
  const legend = [
    {
      label: "รอตรวจ",
      dot: "bg-yellow-400",
      hint: "ยังไม่ถึงคิว / รอกรรมการรับ",
    },
    { label: "กำลังตรวจ", dot: "bg-blue-500", hint: "กรรมการกำลังตรวจอยู่" },
    { label: "ตรวจแล้ว", dot: "bg-green-500", hint: "ตรวจเสร็จเรียบร้อย" },
  ];
  return (
    <div>
      <ul
        className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-700"
        aria-label="legend"
      >
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-2">
            <span className={`h-3.5 w-3.5 rounded-md ${l.dot}`} />
            <span className="font-semibold text-ink-900">{t(l.label)}</span>
            <span className="text-ink-500">· {t(l.hint)}</span>
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] table-fixed border-collapse text-[13px] leading-snug sm:text-[17px]">
          <thead>
            <tr>
              <th className="w-[13%] border border-[var(--qb-line)] bg-[var(--qb-head)] px-1 py-3 text-center text-[14px] font-semibold text-ink-900 sm:w-[19%] sm:px-2 sm:text-[17px]">
                slot
                <br />
                ตั้งต้น
              </th>
              {problemNumbers.map((p) => (
                <th
                  key={p}
                  className="border border-[var(--qb-line)] bg-[var(--qb-head)] px-1 py-3 text-center text-[14px] font-semibold text-ink-900 sm:px-2 sm:text-[17px]"
                >
                  ข้อ {p}
                </th>
              ))}
            </tr>
            {banner && (
              <tr>
                <th
                  colSpan={problemNumbers.length + 1}
                  className="border border-[var(--qb-line)] bg-[var(--qb-head)] px-3 py-2.5 text-left text-[14px] font-semibold text-[var(--qb-banner-fg)] sm:text-[17px]"
                >
                  {banner}
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="border border-[var(--qb-line)] px-1 py-2 align-middle tabular-nums text-ink-900 sm:px-2">
                  {row.label}
                </td>
                {problemNumbers.map((p) => {
                  const cell = row.cells.find((c) => c.problemNumber === p);
                  const active = cell?.status === "IN_PROGRESS";
                  const done = cell?.status === "DONE";
                  return (
                    <td
                      key={p}
                      data-status={cell?.status}
                      className={`border border-[var(--qb-line)] px-[3px] py-2 align-middle sm:px-2 ${
                        active
                          ? "bg-[var(--qb-active)] shadow-[inset_4px_0_0_#3b82f6]"
                          : done
                            ? "bg-green-50"
                            : cell
                              ? "bg-yellow-50"
                              : ""
                      }`}
                    >
                      {cell ? (
                        <div
                          className={
                            done ? "text-[var(--qb-done)]" : "text-ink-900"
                          }
                        >
                          <div className="flex items-center gap-1.5 text-[12px] font-bold tracking-tight sm:text-[17px] sm:tracking-normal">
                            <SchoolLogo
                              code={cell.school.code}
                              size={22}
                              className={done ? "opacity-60" : ""}
                            />
                            {cell.school.code ?? cell.school.name}
                          </div>
                          {row.time && (
                            <div className="tabular-nums">{row.time}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
