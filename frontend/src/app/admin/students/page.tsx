"use client";

import { GraduationCap } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import type { Student } from "@/lib/types";

import { useT } from "@/lib/i18n";
interface ParsedStudentRow {
  ok: boolean;
  schoolCode: string | null;
  seqNo: number | null;
  name: string | null;
  studentCode: string | null;
  error: string | null;
}

interface PreviewResult {
  rows: ParsedStudentRow[];
  validCount: number;
  errorCount: number;
}

export default function AdminStudentsPage() {
  const t = useT();
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Student[]>("/admin/students");
      setStudents(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_load_data")));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function onFileChange(f: File | null) {
    setFile(f);
    setPreview(null);
    setError(null);
  }

  async function handlePreview() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", "preview");
      const { data } = await api.post<PreviewResult>("/admin/students/import", form);
      setPreview(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_read_the_file")));
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", "commit");
      const { data } = await api.post<{ imported: number }>("/admin/students/import", form);
      setToast(t("imported_count_row_s", { count: data.imported }));
      setFile(null);
      setPreview(null);
      await load();
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setError(getApiErrorMessage(err, t("import_failed")));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("delete_this_student"))) return;
    try {
      await api.delete("/admin/students", { params: { id } });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_delete")));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={GraduationCap} title={t("manage_students")} />

      <div className="card-soft space-y-3 p-4">
        <h3 className="font-semibold text-ink-900">{t("import_roster_csv_xlsx")}</h3>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="block w-full max-w-md cursor-pointer text-sm text-ink-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-saed-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-saed-600 file:transition-colors hover:file:bg-saed-100"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePreview} disabled={!file || busy}>
            {t("preview")}
          </Button>
          {preview && preview.validCount > 0 && (
            <Button onClick={handleCommit} disabled={busy}>
              {t("confirm_import_of_count_row_s", { count: preview.validCount })}
            </Button>
          )}
        </div>

        {toast && (
          <p className="rounded-lg bg-state-done-bg px-3 py-2 text-sm text-state-done-fg">
            {toast}
          </p>
        )}
        {error && <p className="text-sm text-state-active-fg">{error}</p>}

        {preview && (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-sunken text-left text-ink-700">
                  <th className="px-2 py-1.5">{t("centre_code")}</th>
                  <th className="px-2 py-1.5">{t("no")}</th>
                  <th className="px-2 py-1.5">{t("name")}</th>
                  <th className="px-2 py-1.5">{t("student_code")}</th>
                  <th className="px-2 py-1.5">{t("check_result")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((row, i) => (
                  <tr key={i} className={row.ok ? "" : "bg-state-active-bg/40"}>
                    <td className="px-2 py-1.5">{row.schoolCode ?? "-"}</td>
                    <td className="px-2 py-1.5">{row.seqNo ?? "-"}</td>
                    <td className="px-2 py-1.5">{row.name ?? "-"}</td>
                    <td className="px-2 py-1.5">{row.studentCode ?? "-"}</td>
                    <td className="px-2 py-1.5">
                      {row.ok ? (
                        <span className="text-state-done-fg">{t("valid")}</span>
                      ) : (
                        <span className="text-state-active-fg">{row.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-soft overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="px-3 py-2">{t("code")}</th>
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 text-ink-900">{s.studentCode}</td>
                <td className="px-3 py-2 text-ink-700">{s.name}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="danger" onClick={() => handleDelete(s.id)}>
                    {t("delete")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
