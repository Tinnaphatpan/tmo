"use client";

import { useMemo, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import type { MyQueueItem } from "@/lib/types";

const draftKey = (itemId: string) => `tmo-score-draft:${itemId}`;

/** Client-only draft (F6): sessionStorage, keyed by queue item; never sent to the backend. */
function readDraft(itemId: string): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(draftKey(itemId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}

interface ScoreFormProps {
  item: MyQueueItem;
  onSubmitted: () => void;
}

/** SPEC §5.2 — grid input 0-10 step 0.5 for every student in the school; submit disabled until all are filled and valid. */
export function ScoreForm({ item, onSubmitted }: ScoreFormProps) {
  const t = useT();
  const initial = useMemo(() => {
    const map: Record<string, string> = {};
    for (const student of item.school.students) {
      const existing = item.scores.find((s) => s.studentId === student.id);
      map[student.id] = existing ? String(existing.value) : "";
    }
    return map;
  }, [item]);

  const [values, setValues] = useState<Record<string, string>>(() => ({ ...initial, ...readDraft(item.id) }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const isValid = (v: string) => {
    if (v === "") return false;
    const n = Number(v);
    return !Number.isNaN(n) && n >= 0 && n <= 10;
  };

  const students = item.school.students;
  const allValid = students.length > 0 && students.every((s) => isValid(values[s.id] ?? ""));

  function handleSaveDraft() {
    try {
      sessionStorage.setItem(draftKey(item.id), JSON.stringify(values));
      setDraftSaved(true);
    } catch {
      setError(t("บันทึกฉบับร่างไม่สำเร็จ"));
    }
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/queue/${item.id}/score`, {
        scores: students.map((s) => ({ studentId: s.id, value: Number(values[s.id]) })),
      });
      try {
        sessionStorage.removeItem(draftKey(item.id));
      } catch {}
      onSubmitted();
    } catch (err) {
      setError(getApiErrorMessage(err, t("บันทึกคะแนนไม่สำเร็จ")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {students.map((student) => (
          <label key={student.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-sunken px-3 py-2">
            <span className="text-sm text-ink-700">
              {student.studentCode} · {student.name}
            </span>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              inputMode="decimal"
              value={values[student.id] ?? ""}
              onChange={(e) => {
                setDraftSaved(false);
                setValues((prev) => ({ ...prev, [student.id]: e.target.value }));
              }}
              className="touch-target w-20 rounded-md border border-line bg-surface px-2 py-1 text-right text-ink-900 outline-none focus:border-saed-500 focus:ring-1 focus:ring-saed-500"
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-state-active-bg px-3 py-2 text-sm text-state-active-fg">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleSaveDraft} disabled={submitting}>
          {draftSaved ? t("บันทึกร่างแล้ว ✓") : t("บันทึกร่าง")}
        </Button>
        <Button onClick={handleSubmit} disabled={!allValid || submitting} className="flex-1">
          {submitting ? t("กำลังบันทึก...") : t("ส่งคะแนนเพื่อรออนุมัติ")}
        </Button>
      </div>
    </div>
  );
}
