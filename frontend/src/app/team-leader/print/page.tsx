"use client";

import { useT } from "@/lib/i18n";
import { useTeamLeaderReport } from "@/lib/use-team-leader-report";
import { MentorScoreTable } from "@/app/team-leader/_components/MentorScoreTable";
import { PrintButton } from "@/app/team-leader/_components/PrintButton";

// SPEC §5.3 — print-only view; `.no-print` hides everything but the table when printed.
export default function TeamLeaderPrintPage() {
  const t = useT();
  const { report, error } = useTeamLeaderReport();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink-900">{t("print_score_report")}</h1>
        <PrintButton />
      </div>

      {error && <p className="text-state-active-fg">{error}</p>}
      {!report && !error && <p className="text-ink-500">{t("loading")}</p>}
      {report && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-ink-900">{report.schoolName}</h2>
          <MentorScoreTable report={report} />
        </div>
      )}
    </div>
  );
}
