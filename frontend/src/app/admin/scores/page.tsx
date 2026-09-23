"use client";

import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

interface ScoreExportRow {
  schoolName: string;
  schoolCode: string | null;
  studentCode: string;
  studentName: string;
  problemNumber: number;
  value: number;
  judgeDisplayName: string;
  judgeUsername: string;
  recordedAt: string;
}

export default function AdminScoresPage() {
  const [rows, setRows] = useState<ScoreExportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ScoreExportRow[]>("/admin/scores")
      .then(({ data }) => setRows(data))
      .catch((err) => setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ")));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">คะแนนทั้งหมด</h2>
        {/* File download, not a page — next/link's client-side nav doesn't apply. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/bff/admin/scores/export">
          <Button variant="secondary">ส่งออก CSV</Button>
        </a>
      </div>

      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <div className="card-soft overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="px-3 py-2">โรงเรียน</th>
              <th className="px-3 py-2">รหัสนักเรียน</th>
              <th className="px-3 py-2">ชื่อ</th>
              <th className="px-3 py-2">ข้อ</th>
              <th className="px-3 py-2">คะแนน</th>
              <th className="px-3 py-2">กรรมการ</th>
              <th className="px-3 py-2">เวลาบันทึก</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-2 text-ink-900">{row.schoolName}</td>
                <td className="px-3 py-2 text-ink-700">{row.studentCode}</td>
                <td className="px-3 py-2 text-ink-700">{row.studentName}</td>
                <td className="px-3 py-2 text-ink-700">{row.problemNumber}</td>
                <td className="px-3 py-2 text-ink-900">{row.value.toFixed(2)}</td>
                <td className="px-3 py-2 text-ink-700">{row.judgeDisplayName}</td>
                <td className="px-3 py-2 text-ink-500">
                  {new Date(row.recordedAt).toLocaleString("th-TH")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
