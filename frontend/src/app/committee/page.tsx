"use client";

import { ClipboardCheck, FilePenLine } from "@/components/ui/icons";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";
import type { MyQueueItem, MyQueueResult } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useT } from "@/lib/i18n";
import { SchoolLogo } from "@/components/SchoolLogo";
import { Button } from "@/components/ui/Button";
import { usePendingEditRequests } from "@/lib/use-pending-edit-requests";
import { ScoreForm } from "@/components/ScoreForm";
import { ScoreEditRequestModal } from "@/app/committee/_components/ScoreEditRequestModal";

const UPCOMING_LIMIT = 3;

export default function CommitteePage() {
  const t = useT();
  const [data, setData] = useState<MyQueueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { scoreIds: pendingScoreIds } = usePendingEditRequests();
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [editModal, setEditModal] = useState<{
    item: MyQueueItem;
    studentId: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<MyQueueResult>("/queue/mine");
      setData(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_load_data")));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);
  useQueueStream(load);

  async function handleClaim(id: string) {
    setActionError(null);
    setClaimingId(id);
    try {
      await api.post(`/queue/${id}/claim`);
      await load();
    } catch (err) {
      setActionError(getApiErrorMessage(err, t("failed_to_claim")));
    } finally {
      setClaimingId(null);
    }
  }

  async function handleRelease(id: string) {
    setActionError(null);
    try {
      await api.post(`/queue/${id}/release`);
      await load();
    } catch (err) {
      setActionError(getApiErrorMessage(err, t("failed_to_release")));
    }
  }

  if (error) {
    return <div className="p-6 text-state-active-fg">{error}</div>;
  }
  if (!data) {
    return <PageSkeleton />;
  }

  const current = data.items.find((i) => i.id === data.currentItemId) ?? null;
  const waitingAll = data.items
    .filter((i) => i.status === "WAITING")
    .sort((a, b) => a.position - b.position);
  // Only the next few are announced ahead of time.
  const waiting = waitingAll.slice(0, UPCOMING_LIMIT);
  const nextItem = waitingAll[0] ?? null;
  const others = data.items.filter(
    (i) => i.status === "IN_PROGRESS" && i.id !== data.currentItemId,
  );
  const done = data.items.filter((i) => i.status === "DONE");
  const holdingAnother = data.currentItemId !== null || data.awaitingApproval;

  return (
    <div className="px-4 py-6">
      <header className="mx-auto mb-6 max-w-4xl">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <ClipboardCheck className="h-5 w-5 text-saed-600" aria-hidden />
          {t("committee_panel")}
        </h1>
          {data.scoringLocked && (
            <p className="text-sm text-state-active-fg">
              {t("scoring_is_closed_use_a_score_edit_request_i")}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6">
        {data.awaitingApproval && (
          <p className="rounded-lg bg-state-pending-approval-bg px-4 py-3 text-sm font-medium text-state-pending-approval-fg">
            ⏳ {t("waiting_for_the_team_leader_to_approve_your")}
          </p>
        )}
        {actionError && (
          <p className="rounded-lg bg-state-active-bg px-4 py-2 text-sm text-state-active-fg">
            {actionError}
          </p>
        )}

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">
            {t("currently_grading")}
          </h2>
          {current ? (
            <div className="animate-fade-in">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-900">
                    <span className="inline-flex items-center gap-2">
                      <SchoolLogo code={current.school.code} size={28} />
                      {current.school.name}
                    </span>
                  </p>
                  <p className="text-sm text-ink-500">
                    {t("problem_n", { n: current.problemNumber })}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleRelease(current.id)}
                >
                  {t("release")}
                </Button>
              </div>
              <ScoreForm
                item={current}
                onSubmitted={() => {
                  setJustSubmitted(true);
                  load();
                }}
              />
            </div>
          ) : (
            <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-500">
                {justSubmitted
                  ? t("scores_sent_for_team_leader_approval")
                  : t("pick_an_item_from_the_queue_below")}
              </p>
              {nextItem && (
                <Button
                  variant="next"
                  disabled={claimingId === nextItem.id || data.awaitingApproval}
                  onClick={() => {
                    setJustSubmitted(false);
                    handleClaim(nextItem.id);
                  }}
                >
                  {claimingId === nextItem.id
                    ? t("claiming")
                    : t("next_school_problem_n", {
                        school: nextItem.school.name,
                        n: nextItem.problemNumber,
                      })}
                </Button>
              )}
            </div>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 flex items-center justify-between font-semibold text-ink-900">
            <span>{t("up_next")}</span>
            {waitingAll.length > UPCOMING_LIMIT && (
              <span className="text-xs font-normal text-ink-500">
                {t("showing_shown_of_total", {
                  shown: UPCOMING_LIMIT,
                  total: waitingAll.length,
                })}
              </span>
            )}
          </h2>
          {waiting.length === 0 ? (
            <p className="text-sm text-ink-500">{t("no_items_waiting")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {waiting.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-ink-900">
                      <span className="inline-flex items-center gap-2">
                        <SchoolLogo code={item.school.code} size={28} />
                        {item.school.name}
                      </span>
                    </p>
                    <p className="text-sm text-ink-500">
                      {t("problem_n", { n: item.problemNumber })}
                    </p>
                  </div>
                  <Button
                    variant="next"
                    disabled={holdingAnother || claimingId === item.id}
                    onClick={() => handleClaim(item.id)}
                  >
                    {claimingId === item.id ? t("claiming") : t("claim")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">
            {t("being_graded_by_other_judges")}
          </h2>
          {others.length === 0 ? (
            <p className="text-sm text-ink-500">{t("nothing_here")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {others.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-ink-900">
                      <span className="inline-flex items-center gap-2">
                        <SchoolLogo code={item.school.code} size={28} />
                        {item.school.name}
                      </span>
                    </p>
                    <p className="text-sm text-ink-500">
                      {t("problem_n", { n: item.problemNumber })}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">{t("done")}</h2>
          {done.length === 0 ? (
            <p className="text-sm text-ink-500">
              {t("nothing_graded_yet")}
            </p>
          ) : (
            <ul className="space-y-4">
              {done.map((item) => {
                const total = item.scores.reduce((sum, s) => sum + s.value, 0);
                const flagged = item.scores.some((s) => pendingScoreIds.has(s.id));
                return (
                  <li
                    key={item.id}
                    className={`rounded-xl border p-4 ${flagged ? "border-[#c8102e]" : "border-line"}`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <SchoolLogo code={item.school.code} size={32} />
                        <div>
                          <p className="font-semibold text-ink-900">{item.school.name}</p>
                          <p className="text-xs text-ink-500">
                            {t("problem_n_total_total", {
                              n: item.problemNumber,
                              total: total.toFixed(2),
                            })}
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        status={
                          item.approvalStatus === "APPROVED"
                            ? "APPROVED"
                            : "PENDING_APPROVAL"
                        }
                      />
                    </div>
                    {flagged && (
                      <p className="mb-2 text-xs font-semibold text-[#c8102e]">
                        ⚠ {t("edit_requested")}
                      </p>
                    )}
                    {/* Requesting a correction never needs scoring to be
                        locked first — SPEC's post-lock-only UI was there
                        because locking was the only trigger anyone had in
                        mind, not a backend restriction (CreateScoreEditRequestUseCase
                        never checks scoringLocked); a judge should be able to
                        flag their own mistake the moment they notice it. */}
                    {/* No school code/logo column here — the card header
                        above already identifies the school, so each row only
                        needs to identify the student within it. */}
                    <div className="table-frame overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-ink-900 text-white">
                            <th className="border border-line px-3 py-1.5 text-left">{t("examinee")}</th>
                            <th className="border border-line px-3 py-1.5 text-center">{t("recorded_score")}</th>
                            <th className="border border-line px-3 py-1.5 text-center">{t("status")}</th>
                            <th className="border border-line px-3 py-1.5 text-center">{t("action")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.school.students.map((student) => {
                            const score = item.scores.find(
                              (s) => s.studentId === student.id,
                            );
                            if (!score) return null;
                            const pending = pendingScoreIds.has(score.id);
                            return (
                              <tr
                                key={student.id}
                                className={pending ? "bg-red-50" : "odd:bg-white even:bg-surface-sunken/60"}
                              >
                                <td className="border border-line px-3 py-1.5 text-ink-900">
                                  {student.name}
                                </td>
                                <td className="border border-line px-3 py-1.5 text-center font-semibold text-ink-900">
                                  {score.value.toFixed(2)}
                                </td>
                                <td className="border border-line px-3 py-1.5 text-center">
                                  {pending ? (
                                    <span className="inline-block rounded-full bg-[#c8102e] px-2 py-0.5 text-xs font-medium text-white">
                                      {t("edit_requested")}
                                    </span>
                                  ) : (
                                    <span className="text-ink-500">{t("saved_status")}</span>
                                  )}
                                </td>
                                <td className="border border-line px-3 py-1.5 text-center">
                                  <button
                                    disabled={pending}
                                    onClick={() =>
                                      setEditModal({ item, studentId: student.id })
                                    }
                                    className="inline-flex items-center gap-1 font-medium text-saed-600 hover:text-saed-700 hover:underline disabled:cursor-not-allowed disabled:text-ink-300 disabled:no-underline"
                                  >
                                    <FilePenLine className="h-4 w-4" aria-hidden />
                                    {t("edit_score")}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {editModal &&
        (() => {
          const score = editModal.item.scores.find(
            (s) => s.studentId === editModal.studentId,
          );
          const student = editModal.item.school.students.find(
            (s) => s.id === editModal.studentId,
          );
          if (!score || !student) return null;
          return (
            <ScoreEditRequestModal
              score={score}
              student={student}
              onClose={() => setEditModal(null)}
              onSubmitted={() => {
                setEditModal(null);
                load();
              }}
            />
          );
        })()}
    </div>
  );
}
