"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

interface ScoreEditRequestItem {
  id: string;
  oldValue: number;
  newValue: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  schoolName: string;
  studentName: string;
  studentCode: string;
  problemNumber: number;
  requestedByDisplayName: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธแล้ว",
};

export default function AdminScoreEditRequestsPage() {
  const [items, setItems] = useState<ScoreEditRequestItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ScoreEditRequestItem[]>("/admin/score-edit-requests");
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReview(id: string, action: "approve" | "reject") {
    setError(null);
    try {
      await api.patch(`/admin/score-edit-requests/${id}`, { action });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "ดำเนินการไม่สำเร็จ"));
    }
  }

  const pending = items.filter((i) => i.status === "PENDING");
  const resolved = items.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink-900">คำขอแก้ไขคะแนน</h2>
      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <div className="space-y-3">
        {pending.length === 0 && <p className="text-sm text-ink-500">ไม่มีคำขอค้างดำเนินการ</p>}
        {pending.map((item) => (
          <div key={item.id} className="card-soft p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-900">
                  {item.schoolName} · {item.studentCode} {item.studentName}
                </p>
                <p className="text-sm text-ink-500">
                  ข้อ {item.problemNumber} · ขอโดย {item.requestedByDisplayName}
                </p>
              </div>
              <p className="text-lg font-semibold text-ink-900">
                <span className="text-ink-300 line-through">{item.oldValue.toFixed(2)}</span>
                {" → "}
                <span className="text-saed-600">{item.newValue.toFixed(2)}</span>
              </p>
            </div>
            <p className="mb-3 text-sm text-ink-700">เหตุผล: {item.reason}</p>
            <div className="flex gap-2">
              <Button onClick={() => handleReview(item.id, "approve")}>อนุมัติ</Button>
              <Button variant="danger" onClick={() => handleReview(item.id, "reject")}>
                ปฏิเสธ
              </Button>
            </div>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-ink-900">ดำเนินการแล้ว</h3>
          <div className="card-soft divide-y divide-line p-2">
            {resolved.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 text-sm">
                <span className="text-ink-700">
                  {item.schoolName} · {item.studentCode} · ข้อ {item.problemNumber} ·{" "}
                  {item.oldValue.toFixed(2)} → {item.newValue.toFixed(2)}
                </span>
                <span
                  className={
                    item.status === "APPROVED" ? "text-state-done-fg" : "text-state-active-fg"
                  }
                >
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
