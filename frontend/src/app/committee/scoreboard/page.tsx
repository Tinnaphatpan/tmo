"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";

import { useT } from "@/lib/i18n";
interface ScoreboardRow {
  schoolName: string;
  schoolCode: string | null;
  problems: (number | null)[];
  total: number;
}

export default function ScoreboardPage() {
  const t = useT();
  const [rows, setRows] = useState<ScoreboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ScoreboardRow[]>("/scoreboard");
      setRows(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_load_data")));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useQueueStream(load);

  return (
    <div className="px-4 py-6">
      <header className="mx-auto mb-4 max-w-4xl">
        <h1 className="text-lg font-bold text-ink-900">{t("scoreboard")}</h1>
        <p className="text-sm text-ink-500">{t("total_score_per_centre_by_problem_read_only")}</p>
      </header>
      <div className="mx-auto max-w-4xl overflow-x-auto rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-card)]">
        {error && <p className="p-4 text-state-active-fg">{error}</p>}
        {!rows && !error && <PageSkeleton rows={6} />}
        {rows && (
          <div className="table-frame">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-ink-900 text-white">
                <th className="border border-line px-3 py-2 text-left">{t("centre")}</th>
                {[1, 2, 3, 4, 5].map((p) => (
                  <th key={p} className="border border-line px-3 py-2 text-center">
                    {t("problem_n", { n: p })}
                  </th>
                ))}
                <th className="border border-line px-3 py-2 text-center">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.schoolName}|${row.schoolCode ?? ""}`} className="odd:bg-white even:bg-surface-sunken/60">
                  <td className="border border-line px-3 py-2 text-ink-900">{row.schoolName}</td>
                  {row.problems.map((v, i) => (
                    <td key={i} className="border border-line px-3 py-2 text-center text-ink-700">
                      {v === null ? "-" : v.toFixed(2)}
                    </td>
                  ))}
                  <td className="border border-line px-3 py-2 text-center font-semibold text-ink-900">
                    {row.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
