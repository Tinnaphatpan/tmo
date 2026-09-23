"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import type { SchoolRef } from "@/lib/types";

export default function AdminSchoolsPage() {
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
      setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ"));
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
      setError(getApiErrorMessage(err, "บันทึกไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ยืนยันการลบโรงเรียนนี้?")) return;
    setError(null);
    try {
      await api.delete("/admin/schools", { params: { id } });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "ลบไม่สำเร็จ"));
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink-900">จัดการโรงเรียน</h2>

      <div className="card-soft p-4">
        <h3 className="mb-3 font-semibold text-ink-900">
          {editing ? `แก้ไข: ${editing.name}` : "เพิ่มโรงเรียนใหม่"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <input
            placeholder="ชื่อโรงเรียน"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500"
          />
          <input
            placeholder="รหัส (code)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500"
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !name}>
              {editing ? "บันทึก" : "เพิ่ม"}
            </Button>
            {editing && (
              <Button variant="ghost" onClick={() => startEdit(null)}>
                ยกเลิก
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
              <th className="px-3 py-2">ชื่อ</th>
              <th className="px-3 py-2">รหัส</th>
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
                      แก้ไข
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(school.id)}>
                      ลบ
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
