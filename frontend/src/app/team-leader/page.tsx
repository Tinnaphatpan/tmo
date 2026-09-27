"use client";

import { useT } from "@/lib/i18n";
import { useState } from "react";
import { PageSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { useTeamLeaderReport } from "@/lib/use-team-leader-report";
import { MentorScoreTable, type EditTarget } from "@/app/team-leader/_components/MentorScoreTable";
import { ScoreEditRequestModal } from "@/app/committee/_components/ScoreEditRequestModal";
import { Button } from "@/components/ui/Button";

export default function TeamLeaderPage() {
  const t = useT();
  const { report, error } = useTeamLeaderReport();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <div className="p-4">
      <header className="mx-auto mb-4 max-w-3xl">
        <div>
          <h1 className="text-lg font-bold text-ink-900">{t("student_scores")}</h1>
          {report && <p className="text-sm text-ink-500">{report.schoolName}</p>}
        </div>
      </header>

      <div className="mx-auto mb-4 flex max-w-3xl gap-2">
        {/* File download, not a page — next/link's client-side nav doesn't apply. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/bff/team-leader/export">
          <Button variant="secondary">📊 Excel</Button>
        </a>
        <Link href="/team-leader/print">
          <Button variant="secondary">🖨️ PDF</Button>
        </Link>
      </div>

      {sent && (
        <p className="mx-auto mb-3 max-w-3xl rounded-lg bg-state-done-bg px-4 py-2 text-sm text-state-done-fg">
          {t("edit_request_sent_to_the_problem_s_judge_awa")}
        </p>
      )}
      <div className="mx-auto max-w-3xl overflow-x-auto rounded-[var(--radius-card)] bg-white/80 p-3 shadow-[var(--shadow-card)]">
        {error && <p className="p-4 text-state-active-fg">{error}</p>}
        {!report && !error && <PageSkeleton rows={6} />}
        {report && (
          <MentorScoreTable
            report={report}
            onRequestEdit={(target) => {
              setSent(false);
              setEditTarget(target);
            }}
          />
        )}
      </div>

      {editTarget && (
        <ScoreEditRequestModal
          score={{ id: editTarget.scoreId, value: editTarget.value }}
          student={{ studentCode: editTarget.studentCode, name: editTarget.studentName }}
          onClose={() => setEditTarget(null)}
          onSubmitted={() => {
            setEditTarget(null);
            setSent(true);
          }}
        />
      )}
    </div>
  );
}
