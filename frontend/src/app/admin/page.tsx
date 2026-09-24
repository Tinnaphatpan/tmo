"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import type { StatusCounts } from "@/lib/types";

interface StaleItem {
  id: string;
  problemNumber: number;
  schoolName: string;
  claimedAt: string | null;
}

interface DashboardResult {
  queueCounts: StatusCounts;
  schoolCount: number;
  committeeCount: number;
  studentCount: number;
  schoolsFullyScored: number;
  pendingEditRequestCount: number;
  staleItems: StaleItem[];
  scoringLocked: boolean;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card-soft p-4">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<DashboardResult>("/admin/dashboard");
      setData(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleLock() {
    if (!data) return;
    const nextLocked = !data.scoringLocked;
    const message = nextLocked
      ? "ปิดรับคะแนน: กรรมการจะบันทึกคะแนนใหม่ตรง ๆ ไม่ได้อีก ยืนยันหรือไม่?"
      : "เปิดรับคะแนนอีกครั้ง ยืนยันหรือไม่?";
    if (!window.confirm(message)) return;

    setToggling(true);
    try {
      await api.patch("/admin/settings/lock", { locked: nextLocked });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "เปลี่ยนสถานะล็อกไม่สำเร็จ"));
    } finally {
      setToggling(false);
    }
  }

  if (error) return <p className="text-state-active-fg">{error}</p>;
  if (!data) return <PageSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">ภาพรวมระบบ</h2>
        <Button
          variant={data.scoringLocked ? "secondary" : "danger"}
          disabled={toggling}
          onClick={handleToggleLock}
        >
          {data.scoringLocked ? "ปลดล็อกคะแนน" : "ปิดรับคะแนนทั้งระบบ"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="รอตรวจ" value={data.queueCounts.waiting} />
        <StatCard label="กำลังตรวจ" value={data.queueCounts.inProgress} />
        <StatCard label="ตรวจแล้ว" value={data.queueCounts.done} />
        <StatCard label="โรงเรียน" value={data.schoolCount} />
        <StatCard label="กรรมการ" value={data.committeeCount} />
        <StatCard label="นักเรียน" value={data.studentCount} />
        <StatCard label="กรอกคะแนนครบแล้ว" value={data.schoolsFullyScored} />
        <StatCard label="คำขอแก้ไขค้าง" value={data.pendingEditRequestCount} />
      </div>

      {data.staleItems.length > 0 && (
        <div className="card-soft border-l-4 border-l-saed-500 p-4">
          <h3 className="mb-2 font-semibold text-ink-900">
            รายการค้างเกิน 30 นาที ({data.staleItems.length})
          </h3>
          <ul className="space-y-1 text-sm text-ink-700">
            {data.staleItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>
                  {item.schoolName} · ข้อ {item.problemNumber}
                </span>
                <a href="/admin/queue" className="text-saed-600 underline">
                  ไปจัดการคิว
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
