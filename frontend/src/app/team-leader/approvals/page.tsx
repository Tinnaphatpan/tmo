"use client";

import { useT } from "@/lib/i18n";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MentorScoreTable, type EditTarget } from "@/app/team-leader/_components/MentorScoreTable";
import { ScoreEditRequestModal } from "@/app/committee/_components/ScoreEditRequestModal";
import { useQueueStream } from "@/lib/use-queue-stream";
import { useTeamLeaderReport } from "@/lib/use-team-leader-report";

interface PendingScore {
  scoreId: string | null;
  studentCode: string;
  studentName: string;
  value: number | null;
}

interface PendingItem {
  id: string;
  problemNumber: number;
  schoolName: string;
  scores: PendingScore[];
}

interface Approved {
  id: string;
  problemNumber: number;
}

export default function TeamLeaderApprovalsPage() {
  const t = useT();
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [approved, setApproved] = useState<Approved[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { report } = useTeamLeaderReport();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<PendingItem[]>("/team-leader/approvals");
      setPending(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_load_the_approval_list")));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useQueueStream(load);

  async function approve(item: PendingItem) {
    setError(null);
    setBusyId(item.id);
    try {
      await api.post(`/team-leader/approvals/${item.id}/approve`);
      setApproved((prev) => [{ id: item.id, problemNumber: item.problemNumber }, ...prev]);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_approve")));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4">
      <header className="mx-auto mb-4 max-w-3xl">
        <h1 className="text-lg font-bold text-ink-900">{t("approve_scores")}</h1>
        {report && <p className="text-sm text-ink-500">{report.schoolName}</p>}
      </header>

      <div className="mx-auto max-w-3xl space-y-6">
        {error && (
          <p className="rounded-lg bg-state-active-bg px-4 py-2 text-sm text-state-active-fg">
            {error}
          </p>
        )}

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">{t("pending_approval")}</h2>
          {pending === null && !error && <PageSkeleton rows={2} />}
          {pending?.length === 0 && (
            <p className="text-sm text-ink-500">{t("nothing_waiting_for_approval")}</p>
          )}
          {sent && (
            <p className="mb-3 rounded-lg bg-state-done-bg px-3 py-2 text-sm text-state-done-fg">
              {t("edit_request_sent_to_the_problem_s_judge_awa")}
            </p>
          )}
          <ul className="space-y-5">
            {pending?.map((item) => {
              const total = (item.scores ?? []).reduce((sum, sc) => sum + (sc.value ?? 0), 0);
              return (
                <li key={item.id} className="rounded-xl border-2 border-ink-900/70 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-ink-900">{t("problem_n", { n: item.problemNumber })}</p>
                      <StatusBadge status="PENDING_APPROVAL" />
                    </div>
                    <p className="text-sm text-ink-500">
                      {t("total_total_points", { total: total.toFixed(2) })}
                    </p>
                  </div>
                  <p className="mb-2 text-xs text-ink-500">
                    {t("review_each_student_s_score_before_approving")}
                  </p>
                  <div className="table-frame">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-ink-900 text-white">
                          <th className="border border-line px-3 py-2 text-left">{t("code")}</th>
                          <th className="border border-line px-3 py-2 text-left">{t("name")}</th>
                          <th className="border border-line px-3 py-2 text-center">{t("score")}</th>
                          <th className="border border-line px-3 py-2 text-center">{t("request_edit")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(item.scores ?? []).map((sc) => (
                          <tr key={sc.studentCode} className="odd:bg-white even:bg-surface-sunken/60">
                            <td className="border border-line px-3 py-2 text-ink-900">{sc.studentCode}</td>
                            <td className="border border-line px-3 py-2 text-ink-900">{sc.studentName}</td>
                            <td className="border border-line px-3 py-2 text-center font-semibold text-ink-900">
                              {sc.value === null ? "-" : sc.value.toFixed(2)}
                            </td>
                            <td className="border border-line px-3 py-2 text-center">
                              {sc.scoreId && sc.value !== null && (
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setSent(false);
                                    setEditTarget({
                                      scoreId: sc.scoreId!,
                                      studentCode: sc.studentCode,
                                      studentName: sc.studentName,
                                      value: sc.value!,
                                      problemNumber: item.problemNumber,
                                    });
                                  }}
                                >
                                  {t("request_a_score_edit")}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button onClick={() => approve(item)} disabled={busyId !== null}>
                      {busyId === item.id ? t("approving") : t("approve_sign")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {approved.length > 0 && (
          <section className="card-soft p-5">
            <h2 className="mb-3 font-semibold text-ink-900">{t("approved_in_this_session")}</h2>
            <ul className="divide-y divide-line">
              {approved.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink-900">{t("problem_n", { n: item.problemNumber })}</span>
                    <StatusBadge status="APPROVED" />
                  </div>
                  {/* File download, not a page — next/link's client-side nav doesn't apply. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a
                    href={`/api/bff/team-leader/approvals/${item.id}/document`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-saed-600 hover:underline"
                  >
                    {t("view_pdf")}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {report && (
          <section className="card-soft overflow-x-auto p-3">
            <MentorScoreTable report={report} />
          </section>
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
