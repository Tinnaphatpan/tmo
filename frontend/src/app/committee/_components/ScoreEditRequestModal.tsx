"use client";

import { useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

import { useT } from "@/lib/i18n";
interface Props {
  score: { id: string; value: number };
  student: { studentCode: string; name: string };
  onClose: () => void;
  onSubmitted: () => void;
}

/** SPEC §2.5 POST /api/score-edit-requests — offered once scoring is locked (SPEC §5.2). */
export function ScoreEditRequestModal({ score, student, onClose, onSubmitted }: Props) {
  const t = useT();
  const [newValue, setNewValue] = useState(String(score.value));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const n = Number(newValue);
  const validValue = newValue !== "" && !Number.isNaN(n) && n >= 0 && n <= 10;

  async function handleSubmit() {
    setError(null);
    if (!validValue || reason.trim() === "") {
      setError(t("please_enter_the_new_score_0_10_and_a_reason"));
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/score-edit-requests", { scoreId: score.id, newValue: n, reason });
      onSubmitted();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_send_the_request")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card-soft w-full max-w-sm p-6 animate-slide-up">
        <h2 className="mb-1 text-lg font-bold text-ink-900">{t("request_a_score_edit")}</h2>
        <p className="mb-4 text-sm text-ink-500">
          {t("code_name_current_score_score", { code: student.studentCode, name: student.name, score: score.value.toFixed(2) })}
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{t("new_score_0_10")}</label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="touch-target w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500 focus:ring-1 focus:ring-saed-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{t("reason")}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500 focus:ring-1 focus:ring-saed-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-state-active-bg px-3 py-2 text-sm text-state-active-fg">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              {t("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? t("sending") : t("send_request")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
