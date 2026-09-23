"use client";

import { useMemo, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import type { MyQueueItem } from "@/lib/types";

interface ScoreFormProps {
  item: MyQueueItem;
  onSubmitted: () => void;
}

/** SPEC §5.2 — grid input 0-10 step 0.5 for every student in the school; submit disabled until all are filled and valid. */
export function ScoreForm({ item, onSubmitted }: ScoreFormProps) {
  const initial = useMemo(() => {
    const map: Record<string, string> = {};
    for (const student of item.school.students) {
      const existing = item.scores.find((s) => s.studentId === student.id);
      map[student.id] = existing ? String(existing.value) : "";
    }
    return map;
  }, [item]);

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = (v: string) => {
    if (v === "") return false;
    const n = Number(v);
    return !Number.isNaN(n) && n >= 0 && n <= 10;
  };

  const students = item.school.students;
  const allValid = students.length > 0 && students.every((s) => isValid(values[s.id] ?? ""));

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/queue/${item.id}/score`, {
        scores: students.map((s) => ({ studentId: s.id, value: Number(values[s.id]) })),
      });
      onSubmitted();
    } catch (err) {
      setError(getApiErrorMessage(err, "บันทึกคะแนนไม่สำเร็จ"));
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
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [student.id]: e.target.value }))
              }
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

      <Button onClick={handleSubmit} disabled={!allValid || submitting} className="w-full">
        {submitting ? "กำลังบันทึก..." : "บันทึกและปิดคิวนี้"}
      </Button>
    </div>
  );
}
