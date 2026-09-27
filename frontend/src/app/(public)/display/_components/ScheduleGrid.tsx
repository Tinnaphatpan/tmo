import type { QueueSlot } from "@/lib/types";

import { useT } from "@/lib/i18n";
const STATUS_CELL_CLASS: Record<string, string> = {
  WAITING: "bg-grid-cell text-ink-500",
  IN_PROGRESS: "bg-state-active-bg text-state-active-fg font-semibold",
  DONE: "bg-state-done-bg text-state-done-fg",
};

function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

/** SPEC §3.2/§5.1 — mimics the wall-poster rotation schedule; used on /display and /queue. */
export function ScheduleGrid({
  slots,
  problemNumbers,
  maxRows,
}: {
  slots: QueueSlot[];
  problemNumbers: number[];
  maxRows?: number;
}) {
  const t = useT();
  const rows = maxRows ? slots.slice(0, maxRows) : slots;

  return (
    <div className="overflow-x-auto rounded-xl border border-grid-line">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="bg-grid-head text-ink-900">
            <th className="border-b border-grid-line px-3 py-2 text-left font-semibold">
              {t("time_slot")}
            </th>
            {problemNumbers.map((p) => (
              <th key={p} className="border-b border-grid-line px-3 py-2 text-center font-semibold">
                {t("problem_n", { n: p })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((slot) => (
            <tr key={slot.startsAt}>
              <td className="border-b border-grid-line bg-grid-banner px-3 py-2 font-medium text-white">
                {formatSlotTime(slot.startsAt)}
              </td>
              {problemNumbers.map((p) => {
                const cell = slot.cells.find((c) => c.problemNumber === p);
                return (
                  <td
                    key={p}
                    className={`border-b border-grid-line px-3 py-2 text-center ${
                      cell ? STATUS_CELL_CLASS[cell.status] : ""
                    }`}
                  >
                    {cell?.school.code ?? "-"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
