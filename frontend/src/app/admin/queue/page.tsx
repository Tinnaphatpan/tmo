"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { SchoolRef } from "@/lib/types";

/** Shape of GET /admin/queue (backend QueueItemWithSchool): school fields are flat, not nested. */
interface AdminQueueItem {
  id: string;
  problemNumber: number;
  status: string;
  position: number;
  scheduledAt: string | null;
  schoolId: string;
  schoolName: string;
  schoolCode: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

export default function AdminQueuePage() {
  const [items, setItems] = useState<AdminQueueItem[]>([]);
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterProblem, setFilterProblem] = useState<number | "all">("all");
  const [schoolId, setSchoolId] = useState("");
  const [problemNumber, setProblemNumber] = useState(1);
  const [scheduleDate, setScheduleDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
  );
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [itemsRes, schoolsRes] = await Promise.all([
        api.get<AdminQueueItem[]>("/admin/queue"),
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

  async function handleGenerate() {
    const hasItems = items.length > 0;
    const message = hasItems
      ? `สร้างตารางคิวหมุนเวียนวันที่ ${scheduleDate}?

รายการที่มีอยู่ ${items.length} รายการ (ที่ยังรอตรวจ) จะถูกจัดเวลาและลำดับใหม่ และเพิ่มรายการที่ยังขาดให้ครบทุกศูนย์ทุกข้อ`
      : `สร้างตารางคิวหมุนเวียนวันที่ ${scheduleDate} (ทุกศูนย์ × 5 ข้อ เริ่ม 13:30 ช่องละ 15 นาที)?`;
    if (!window.confirm(message)) return;
    setError(null);
    setNotice(null);
    setGenerating(true);
    try {
      const { data } = await api.post<{ created: number; updated: number; total: number }>(
        "/admin/queue/generate",
        { date: scheduleDate },
      );
      setNotice(
        `สร้างตารางคิวแล้ว: เพิ่มใหม่ ${data.created} รายการ · จัดเวลาใหม่ ${data.updated} รายการ (รวม ${data.total})`,
      );
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "สร้างตารางคิวไม่สำเร็จ"));
    } finally {
      setGenerating(false);
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
      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <div className="card-soft space-y-3 p-4">
        <div>
          <h3 className="font-semibold text-ink-900">สร้างตารางคิวตามการหมุนเวียน</h3>
          <p className="text-sm text-ink-500">
            สร้างคิวครบทุกศูนย์ × 5 ข้อ เริ่ม 13:30 ช่องละ 15 นาที ตามตารางที่ติดบอร์ด — ทำได้ก่อนเริ่มตรวจเท่านั้น
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="schedule-date" className="mb-1 block text-sm text-ink-500">
              วันที่จัดตาราง
            </label>
            <input
              id="schedule-date"
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating || !scheduleDate}>
            {generating ? "กำลังสร้าง..." : "สร้างตารางคิว"}
          </Button>
        </div>
        {notice && <p className="rounded-lg bg-state-done-bg px-3 py-2 text-sm text-state-done-fg">{notice}</p>}
      </div>

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


      <div className="card-soft overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="px-3 py-2">ศูนย์สอบ</th>
              <th className="px-3 py-2">ข้อ</th>
              <th className="px-3 py-2">ลำดับ</th>
              <th className="px-3 py-2">เวลา</th>
              <th className="px-3 py-2">สถานะ</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2 text-ink-900">{item.schoolName}</td>
                <td className="px-3 py-2 text-ink-700">{item.problemNumber}</td>
                <td className="px-3 py-2 text-ink-700">{item.position}</td>
                <td className="px-3 py-2 text-ink-700 tabular-nums">{formatTime(item.scheduledAt)}</td>
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
