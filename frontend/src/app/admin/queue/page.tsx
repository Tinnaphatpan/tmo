"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PublicQueueItem, SchoolRef } from "@/lib/types";

export default function AdminQueuePage() {
  const [items, setItems] = useState<PublicQueueItem[]>([]);
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterProblem, setFilterProblem] = useState<number | "all">("all");
  const [schoolId, setSchoolId] = useState("");
  const [problemNumber, setProblemNumber] = useState(1);

  const load = useCallback(async () => {
    try {
      const [itemsRes, schoolsRes] = await Promise.all([
        api.get<PublicQueueItem[]>("/admin/queue"),
        api.get<SchoolRef[]>("/admin/schools"),
      ]);
      setItems(itemsRes.data);
      setSchools(schoolsRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!schoolId) return;
    setError(null);
    try {
      await api.post("/admin/queue", { schoolId, problemNumber });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "เพิ่มรายการไม่สำเร็จ"));
    }
  }

  async function handleMove(id: string, direction: "up" | "down") {
    try {
      await api.patch("/admin/queue", { id, direction });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "ย้ายลำดับไม่สำเร็จ"));
    }
  }

  async function handleForceRelease(id: string) {
    try {
      await api.post(`/queue/${id}/release`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "คืนคิวไม่สำเร็จ"));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ยืนยันการลบรายการคิวนี้?")) return;
    try {
      await api.delete("/admin/queue", { params: { id } });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "ลบไม่สำเร็จ"));
    }
  }

  const filtered = items
    .filter((i) => filterProblem === "all" || i.problemNumber === filterProblem)
    .sort((a, b) => a.problemNumber - b.problemNumber || a.position - b.position);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink-900">จัดการคิว</h2>

      <div className="card-soft flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-sm text-ink-500">โรงเรียน</label>
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
          >
            <option value="">เลือกโรงเรียน</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-500">ข้อ</label>
          <select
            value={problemNumber}
            onChange={(e) => setProblemNumber(Number(e.target.value))}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleAdd} disabled={!schoolId}>
          เพิ่มรายการ
        </Button>

        <div className="ml-auto">
          <label className="mb-1 block text-sm text-ink-500">กรองตามข้อ</label>
          <select
            value={filterProblem}
            onChange={(e) =>
              setFilterProblem(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
          >
            <option value="all">ทั้งหมด</option>
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                ข้อ {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <div className="card-soft overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="px-3 py-2">ศูนย์สอบ</th>
              <th className="px-3 py-2">ข้อ</th>
              <th className="px-3 py-2">ลำดับ</th>
              <th className="px-3 py-2">สถานะ</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2 text-ink-900">{item.school.name}</td>
                <td className="px-3 py-2 text-ink-700">{item.problemNumber}</td>
                <td className="px-3 py-2 text-ink-700">{item.position}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" onClick={() => handleMove(item.id, "up")}>
                      ↑
                    </Button>
                    <Button variant="ghost" onClick={() => handleMove(item.id, "down")}>
                      ↓
                    </Button>
                    {item.status === "IN_PROGRESS" && (
                      <Button variant="secondary" onClick={() => handleForceRelease(item.id)}>
                        คืนคิว
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => handleDelete(item.id)}>
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
