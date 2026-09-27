"use client";

import { FilePenLine } from "@/components/ui/icons";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import type { ScoreEditRequestItem } from "@/components/EditRequestAlertBar";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

/**
 * Judge-side (COMMITTEE / STAFF) view of edit requests: requests a mentor raised
 * for a problem in their scope (they approve/reject) and their own requests
 * (status only — their team leader decides those).
 */
export function JudgeEditRequests() {
  const t = useT();
  const [items, setItems] = useState<ScoreEditRequestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ScoreEditRequestItem[]>("/score-edit-requests");
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_load_data")));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);
  useQueueStream(load);

  async function review(id: string, action: "approve" | "reject") {
    setError(null);
    setBusyId(id);
    try {
      await api.patch(`/score-edit-requests/${id}`, { action });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("action_failed")));
    } finally {
      setBusyId(null);
    }
  }

  const incoming = (items ?? []).filter((i) => i.requestedByRole === "TEAM_LEADER");
  const own = (items ?? []).filter((i) => i.requestedByRole !== "TEAM_LEADER");
  const pendingIncoming = incoming.filter((i) => i.status === "PENDING");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <FilePenLine className="h-5 w-5 text-saed-600" aria-hidden />
          {t("score_edit_requests")}
        </h1>
      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <section className="space-y-3">
        <h2 className="font-semibold text-ink-900">{t("requests_from_the_team_leader_for_you_to_rev")}</h2>
        {pendingIncoming.length === 0 && (
          <p className="text-sm text-ink-500">{t("no_pending_requests")}</p>
        )}
        {pendingIncoming.map((item) => (
          <div key={item.id} className="card-soft border-l-4 border-l-[#c8102e] p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink-900">
                  {item.schoolName} · {item.studentCode} {item.studentName}
                </p>
                <p className="text-sm text-ink-500">
                  {t("problem_n_requested_by_name", {
                    n: item.problemNumber,
                    name: item.requestedByDisplayName,
                  })}
                </p>
              </div>
              <p className="text-lg font-semibold text-ink-900">
                <span className="text-ink-300 line-through">{item.oldValue.toFixed(2)}</span>
                {" → "}
                <span className="text-saed-600">{item.newValue.toFixed(2)}</span>
              </p>
            </div>
            <p className="mb-3 text-sm text-ink-700">{t("reason_reason", { reason: item.reason })}</p>
            <div className="flex gap-2">
              <Button disabled={busyId !== null} onClick={() => review(item.id, "approve")}>
                {t("approve")}
              </Button>
              <Button
                variant="danger"
                disabled={busyId !== null}
                onClick={() => review(item.id, "reject")}
              >
                {t("reject")}
              </Button>
            </div>
          </div>
        ))}
      </section>

      {(incoming.length > pendingIncoming.length || own.length > 0) && (
        <section>
          <h2 className="mb-2 font-semibold text-ink-900">{t("request_history")}</h2>
          <div className="card-soft divide-y divide-line p-2">
            {[...own, ...incoming.filter((i) => i.status !== "PENDING")].map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="text-ink-700">
                  {item.schoolName} · {item.studentCode} · {t("problem_n", { n: item.problemNumber })} ·{" "}
                  {item.oldValue.toFixed(2)} → {item.newValue.toFixed(2)}
                  {item.requestedByRole !== "TEAM_LEADER" && ` (${t("your_request")})`}
                </span>
                <span
                  className={
                    item.status === "APPROVED"
                      ? "text-state-done-fg"
                      : item.status === "REJECTED"
                        ? "text-state-active-fg"
                        : "text-state-pending-approval-fg"
                  }
                >
                  {t(STATUS_LABEL[item.status])}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
