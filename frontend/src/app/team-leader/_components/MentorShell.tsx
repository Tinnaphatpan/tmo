"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";
import { useT } from "@/lib/i18n";
import { SchoolLogo } from "@/components/SchoolLogo";
import { EditRequestAlertBar } from "@/components/EditRequestAlertBar";
import { schoolColor, schoolTint } from "@/lib/school-theme";
import type { TeamLeaderReport } from "@/lib/use-team-leader-report";

/**
 * Wraps every mentor page: page background in the colour of the school they
 * look after, the school's logo + name, the red edit-request bar, and a live
 * notice when a judge has submitted scores that still need their approval.
 */
export function MentorShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [school, setSchool] = useState<{ name: string; code: string | null } | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    api
      .get<TeamLeaderReport>("/team-leader/report")
      .then(({ data }) => setSchool({ name: data.schoolName, code: data.schoolCode }))
      .catch(() => {});
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const { data } = await api.get<unknown[]>("/team-leader/approvals");
      setPending(data.length);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    loadPending();
  }, [loadPending]);
  useQueueStream(loadPending);

  const accent = schoolColor(school?.code);

  return (
    <div className="min-h-dvh" style={{ background: schoolTint(school?.code) }}>
      <EditRequestAlertBar href="/team-leader/score-edit-requests" />
      <div
        className="flex items-center gap-3 border-b-4 bg-white/70 px-4 py-3 backdrop-blur print:hidden"
        style={{ borderColor: accent }}
      >
        {school && <SchoolLogo code={school.code} size={44} />}
        <div>
          <p className="text-xs text-ink-500">{t("your_centre")}</p>
          <p className="text-base font-bold text-ink-900">{school?.name ?? "…"}</p>
        </div>
      </div>
      {pending > 0 && (
        <Link
          href="/team-leader/approvals"
          className="flex items-center justify-center gap-2 bg-state-pending-approval-bg px-4 py-2 text-sm font-semibold text-state-pending-approval-fg print:hidden"
        >
          <span aria-hidden>🔔</span>
          {t("judges_submitted_count_score_set_s_please_re", {
            count: pending,
          })}
        </Link>
      )}
      {children}
    </div>
  );
}
