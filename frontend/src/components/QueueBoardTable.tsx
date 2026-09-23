import type { QueueSlot } from "@/lib/types";

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

/**
 * Whole-schedule overview: one row per start slot, one column per problem;
 * each cell shows the school code and its time. The cell being examined right
 * now (IN_PROGRESS) is highlighted; finished cells are muted.
 */
export function QueueBoardTable({
  slots,
  problemNumbers,
}: {
  slots: QueueSlot[];
  problemNumbers: number[];
}) {
  const banner = boardBanner(slots);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] table-fixed border-collapse text-[13px] leading-snug sm:text-[17px]">
        <thead>
          <tr>
            <th className="w-[13%] border border-[var(--qb-line)] bg-[var(--qb-head)] px-1 py-3 text-center text-[14px] sm:w-[19%] sm:px-2 sm:text-[17px] font-semibold text-ink-900">
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
                className="border border-[var(--qb-line)] bg-[var(--qb-head)] px-3 py-2.5 text-left text-[14px] sm:text-[17px] font-semibold text-[var(--qb-banner-fg)]"
              >
                {banner}
              </th>
            </tr>
          )}
        </thead>
        <tbody>
          {slots.map((slot) => {
            const time = formatBoardTime(slot.startsAt);
            return (
              <tr key={slot.startsAt}>
                <td className="border border-[var(--qb-line)] px-1 py-2 align-middle tabular-nums sm:px-2 text-ink-900">
                  {time}
                </td>
                {problemNumbers.map((p) => {
                  const cell = slot.cells.find((c) => c.problemNumber === p);
                  const active = cell?.status === "IN_PROGRESS";
                  const done = cell?.status === "DONE";
                  return (
                    <td
                      key={p}
                      data-status={cell?.status}
                      className={`border border-[var(--qb-line)] px-[3px] py-2 align-middle sm:px-2 ${
                        active ? "bg-[var(--qb-active)]" : ""
                      }`}
                    >
                      {cell ? (
                        <div className={done ? "text-[var(--qb-done)]" : "text-ink-900"}>
                          <div className="text-[12px] font-bold tracking-tight sm:text-[17px] sm:tracking-normal">
                            {cell.school.code ?? cell.school.name}
                          </div>
                          <div className="tabular-nums">{time}</div>
                        </div>
                      ) : (
                        <span className="text-ink-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
