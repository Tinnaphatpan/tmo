"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import type { SchoolRef } from "@/lib/types";

import { useT } from "@/lib/i18n";
export default function AdminSchoolsPage() {
  const t = useT();
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SchoolRef | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<SchoolRef[]>("/admin/schools");
      setSchools(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_load_data")));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(school: SchoolRef | null) {
    setEditing(school);
    setName(school?.name ?? "");
    setCode(school?.code ?? "");
    setError(null);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        await api.patch("/admin/schools", { id: editing.id, name, code });
      } else {
        await api.post("/admin/schools", { name, code });
      }
      startEdit(null);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_save")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("delete_this_school"))) return;
    setError(null);
    try {
      await api.delete("/admin/schools", { params: { id } });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_delete")));
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink-900">{t("manage_schools")}</h2>

      <div className="card-soft p-4">
        <h3 className="mb-3 font-semibold text-ink-900">
          {editing ? `แก้ไข: ${editing.name}` : t("add_a_new_school")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <input
            placeholder={t("school_name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500"
          />
          <input
            placeholder={t("code_2")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500"
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !name}>
              {editing ? t("save") : t("add")}
            </Button>
            {editing && (
              <Button variant="ghost" onClick={() => startEdit(null)}>
                {t("cancel")}
              </Button>
            )}
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-state-active-fg">{error}</p>}
      </div>

      <div className="card-soft overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("code")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {schools.map((school) => (
              <tr key={school.id}>
                <td className="px-3 py-2 text-ink-900">{school.name}</td>
                <td className="px-3 py-2 text-ink-700">{school.code}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => startEdit(school)}>
                      {t("edit")}
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(school.id)}>
                      {t("delete")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
