"use client";

import Link from "next/link";
import { useMentorReport } from "@/lib/use-mentor-report";
import { MentorScoreTable } from "@/components/MentorScoreTable";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/LogoutButton";

export default function MentorPage() {
  const { report, error } = useMentorReport();

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="mx-auto mb-4 flex max-w-3xl items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink-900">คะแนนนักเรียน</h1>
          {report && <p className="text-sm text-ink-500">{report.schoolName}</p>}
        </div>
        <LogoutButton />
      </header>

      <div className="mx-auto mb-4 flex max-w-3xl gap-2">
        {/* File download, not a page — next/link's client-side nav doesn't apply. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/bff/mentor/export">
          <Button variant="secondary">📊 Excel</Button>
        </a>
        <Link href="/mentor/print">
          <Button variant="secondary">🖨️ PDF</Button>
        </Link>
      </div>

      <div className="mx-auto max-w-3xl overflow-x-auto rounded-xl border border-line bg-surface p-2">
        {error && <p className="p-4 text-state-active-fg">{error}</p>}
        {!report && !error && <p className="p-4 text-ink-500">กำลังโหลด...</p>}
        {report && <MentorScoreTable report={report} />}
      </div>
    </div>
  );
}
