"use client";

import { ClipboardList } from "@/components/ui/icons";
import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

import { useT } from "@/lib/i18n";
interface ScoreExportRow {
  schoolName: string;
  schoolCode: string | null;
  studentCode: string;
  studentName: string;
  problemNumber: number;
  value: number;
  judgeDisplayName: string;
  judgeUsername: string;
  recordedAt: string;
  /** Only present when the row can be targeted for a direct edit (every row
   * from GET /admin/scores has one — undefined only guards a shape change). */
  scoreId?: string;
}

export default function AdminScoresPage() {
  const t = useT();
  const [rows, setRows] = useState<ScoreExportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  function load() {
    api
      .get<ScoreExportRow[]>("/admin/scores")
      .then(({ data }) => setRows(data))
      .catch((err) => setError(getApiErrorMessage(err, t("failed_to_load_data"))));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(row: ScoreExportRow) {
    if (!row.scoreId) return;
    setRowError(null);
    setEditingId(row.scoreId);
    setEditValue(String(row.value));
  }

  async function saveEdit(scoreId: string) {
    const value = Number(editValue);
    setSaving(true);
    setRowError(null);
    try {
      await api.patch(`/admin/scores/${scoreId}`, { value });
      setEditingId(null);
      load();
    } catch (err) {
      setRowError({ id: scoreId, message: getApiErrorMessage(err, t("failed_to_save")) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <ClipboardList className="h-5 w-5 text-saed-600" aria-hidden />
          {t("all_scores")}
        </h2>
        {/* File download, not a page — next/link's client-side nav doesn't apply. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/bff/admin/scores/export">
          <Button variant="secondary">{t("export_csv")}</Button>
        </a>
      </div>

      {error && <p className="text-sm text-state-active-fg">{error}</p>}
      <p className="text-xs text-ink-500">{t("admin_score_edit_note")}</p>

      <div className="card-soft overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="px-3 py-2">{t("schools")}</th>
              <th className="px-3 py-2">{t("student_code")}</th>
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("problem")}</th>
              <th className="px-3 py-2">{t("score")}</th>
              <th className="px-3 py-2">{t("committee")}</th>
              <th className="px-3 py-2">{t("saved_at")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, i) => {
              const editing = row.scoreId && editingId === row.scoreId;
              return (
                <tr key={i}>
                  <td className="px-3 py-2 text-ink-900">{row.schoolName}</td>
                  <td className="px-3 py-2 text-ink-700">{row.studentCode}</td>
                  <td className="px-3 py-2 text-ink-700">{row.studentName}</td>
                  <td className="px-3 py-2 text-ink-700">{row.problemNumber}</td>
                  <td className="px-3 py-2 text-ink-900">
                    {editing ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-ink-900"
                          />
                          <Button
                            disabled={saving}
                            onClick={() => row.scoreId && saveEdit(row.scoreId)}
                          >
                            {saving ? t("saving") : t("save")}
                          </Button>
                          <Button variant="ghost" disabled={saving} onClick={() => setEditingId(null)}>
                            {t("cancel")}
                          </Button>
                        </div>
                        {rowError && rowError.id === row.scoreId && (
                          <p className="text-xs text-state-active-fg">{rowError.message}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        disabled={!row.scoreId}
                        onClick={() => startEdit(row)}
                        className="touch-target rounded-lg border border-transparent px-1.5 py-0.5 font-medium hover:border-saed-400 disabled:cursor-not-allowed"
                        title={row.scoreId ? t("edit") : undefined}
                      >
                        {row.value.toFixed(2)}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink-700">{row.judgeDisplayName}</td>
                  <td className="px-3 py-2 text-ink-500">
                    {new Date(row.recordedAt).toLocaleString("th-TH")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
