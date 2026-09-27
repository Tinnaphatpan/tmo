import type { TeamLeaderReport } from "@/lib/use-team-leader-report";

import { useT } from "@/lib/i18n";

export interface EditTarget {
  scoreId: string;
  studentCode: string;
  studentName: string;
  value: number;
  problemNumber: number;
}

export function MentorScoreTable({
  report,
  onRequestEdit,
  pendingScoreIds,
}: {
  report: TeamLeaderReport;
  /** When given, every scored cell gets an "ขอแก้ไข" button (per-student edit request). */
  onRequestEdit?: (target: EditTarget) => void;
  /** Scores with a pending edit request get a red strip. */
  pendingScoreIds?: Set<string>;
}) {
  const t = useT();
  return (
    <div className="table-frame">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="bg-ink-900 text-white">
            <th className="border border-line px-3 py-2.5 text-left">{t("code")}</th>
            <th className="border border-line px-3 py-2.5 text-left">{t("name")}</th>
            {[1, 2, 3, 4, 5].map((p) => (
              <th key={p} className="border border-line px-3 py-2.5 text-center">
                {t("problem_n", { n: p })}
              </th>
            ))}
            <th className="border border-line px-3 py-2.5 text-center">{t("total")}</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => (
            <tr key={row.studentCode} className="odd:bg-white even:bg-surface-sunken/60">
              <td className="border border-line px-3 py-2 text-ink-900">{row.studentCode}</td>
              <td className="border border-line px-3 py-2 text-ink-900">{row.name}</td>
              {row.scores.map((score, i) => {
                const scoreId = row.scoreIds?.[i] ?? null;
                const flagged = !!scoreId && !!pendingScoreIds?.has(scoreId);
                return (
                  <td
                    key={i}
                    title={flagged ? t("edit_requested") : undefined}
                    className={`border border-line px-3 py-2 text-center text-ink-700 ${
                      flagged ? "border-l-4 bg-red-50 font-semibold text-[#c8102e] [border-left-color:#c8102e_!important]" : ""
                    }`}
                  >
                    <span>{score === null ? "-" : score.toFixed(2)}</span>
                    {onRequestEdit && score !== null && scoreId && (
                      <button
                        type="button"
                        title={t("request_a_score_edit")}
                        aria-label={t("request_a_score_edit")}
                        onClick={() =>
                          onRequestEdit({
                            scoreId,
                            studentCode: row.studentCode,
                            studentName: row.name,
                            value: score,
                            problemNumber: i + 1,
                          })
                        }
                        className="ml-1.5 rounded-md border border-ink-300 px-1.5 text-xs text-ink-700 hover:border-saed-500 hover:text-saed-600"
                      >
                        ✎
                      </button>
                    )}
                  </td>
                );
              })}
              <td className="border border-line px-3 py-2 text-center font-semibold text-ink-900">
                {row.total.toFixed(2)}
              </td>
            </tr>
          ))}
          <tr className="bg-ink-900/10 font-bold">
            <td className="border border-line px-3 py-2" colSpan={2}>
              {t("school_total")}
            </td>
            <td className="border border-line px-3 py-2" colSpan={5} />
            <td className="border border-line px-3 py-2 text-center">
              {report.grandTotal.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
