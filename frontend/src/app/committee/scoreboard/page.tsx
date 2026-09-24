"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";

interface ScoreboardRow {
  schoolName: string;
  schoolCode: string | null;
  problems: (number | null)[];
  total: number;
}

/** First-pass read-only scoreboard: per-school × per-problem score sums. */
export default function ScoreboardPage() {
  const [rows, setRows] = useState<ScoreboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ScoreboardRow[]>("/scoreboard");
      setRows(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useQueueStream(load);

  return (
    <div className="px-4 py-6">
      <header className="mx-auto mb-4 max-w-4xl">
        <h1 className="text-lg font-bold text-ink-900">สรุปคะแนน</h1>
        <p className="text-sm text-ink-500">คะแนนรวมของแต่ละศูนย์ แยกตามข้อ (อ่านอย่างเดียว)</p>
      </header>
      <div className="mx-auto max-w-4xl overflow-x-auto rounded-xl border border-line bg-surface p-2">
        {error && <p className="p-4 text-state-active-fg">{error}</p>}
        {!rows && !error && <PageSkeleton rows={6} />}
        {rows && (
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-sunken text-ink-700">
                <th className="border border-line px-3 py-2 text-left">ศูนย์</th>
                {[1, 2, 3, 4, 5].map((p) => (
                  <th key={p} className="border border-line px-3 py-2 text-center">
                    ข้อ {p}
                  </th>
                ))}
                <th className="border border-line px-3 py-2 text-center">รวม</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.schoolName}|${row.schoolCode ?? ""}`}>
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
        )}
      </div>
    </div>
  );
}
