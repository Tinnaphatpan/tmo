"use client";

import { useMentorReport } from "@/lib/use-mentor-report";
import { MentorScoreTable } from "@/components/MentorScoreTable";
import { PrintButton } from "@/components/PrintButton";

// SPEC §5.3 — print-only view; `.no-print` hides everything but the table when printed.
export default function MentorPrintPage() {
  const { report, error } = useMentorReport();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink-900">พิมพ์รายงานคะแนน</h1>
        <PrintButton />
      </div>

      {error && <p className="text-state-active-fg">{error}</p>}
      {!report && !error && <p className="text-ink-500">กำลังโหลด...</p>}
      {report && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-ink-900">{report.schoolName}</h2>
          <MentorScoreTable report={report} />
        </div>
      )}
    </div>
  );
}
