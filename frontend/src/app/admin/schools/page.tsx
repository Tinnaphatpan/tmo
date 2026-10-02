"use client";

import { School } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { SchoolRef } from "@/lib/types";

import { useT } from "@/lib/i18n";
export default function AdminSchoolsPage() {
  const t = useT();
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    danger?: boolean;
    errorFallback?: string;
    run: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [editing, setEditing] = useState<SchoolRef | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

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
    setNotice(null);
  }

  // Validate -> confirm -> save -> success message, per the school-management
  // flow diagram ("ตรวจสอบความถูกต้องของข้อมูล" -> "ยืนยันการบันทึกข้อมูล").
  // The same form is reused for add and edit, pre-filled on edit.
  function handleSaveClick() {
    setError(null);
    setNotice(null);
    if (!name) {
      setError(t("please_enter_a_school_name"));
      return;
    }
    const codeSuffix = code ? ` (${code})` : "";
    if (editing) {
      setConfirmAction({
        title: t("confirm_edit_school"),
        message: t("confirm_edit_school_message", { name, codeSuffix }),
        errorFallback: t("failed_to_save"),
        run: async () => {
          await api.patch("/admin/schools", { id: editing.id, name, code });
          startEdit(null);
          await load();
          setNotice(t("school_edited_successfully"));
        },
      });
    } else {
      setConfirmAction({
        title: t("confirm_add_school"),
        message: t("confirm_add_school_message", { name, codeSuffix }),
        errorFallback: t("failed_to_save"),
        run: async () => {
          await api.post("/admin/schools", { name, code });
          startEdit(null);
          await load();
          setNotice(t("school_added_successfully"));
        },
      });
    }
  }

  function handleDeleteClick(school: SchoolRef) {
    setError(null);
    setNotice(null);
    setConfirmAction({
      title: t("delete_this_school"),
      message: t("confirm_delete_school_message", { name: school.name }),
      danger: true,
      errorFallback: t("failed_to_delete"),
      run: async () => {
        await api.delete("/admin/schools", { params: { id: school.id } });
        await load();
        setNotice(t("school_deleted_successfully"));
      },
    });
  }

  async function handleConfirmYes() {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      await confirmAction.run();
      setConfirmAction(null);
    } catch (err) {
      setError(getApiErrorMessage(err, confirmAction.errorFallback ?? t("action_failed")));
      setConfirmAction(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={School} title={t("manage_schools")} />

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
            <Button onClick={handleSaveClick} disabled={!name}>
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
        {notice && (
          <p className="mt-2 rounded-lg bg-state-done-bg px-3 py-2 text-sm text-state-done-fg">{notice}</p>
        )}
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
                    <Button variant="danger" onClick={() => handleDeleteClick(school)}>
                      {t("delete")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          danger={confirmAction.danger}
          busy={confirmBusy}
          onConfirm={handleConfirmYes}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
