"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useT } from "@/lib/i18n";
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

export default function TeamLeaderScoreEditRequestsPage() {
  const t = useT();
  const [items, setItems] = useState<ScoreEditRequestItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ScoreEditRequestItem[]>(
        "/team-leader/score-edit-requests",
      );
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("โหลดข้อมูลไม่สำเร็จ")));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReview(id: string, action: "approve" | "reject") {
    setError(null);
    try {
      await api.patch(`/team-leader/score-edit-requests/${id}`, { action });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("ดำเนินการไม่สำเร็จ")));
    }
  }

  const pending = items.filter((i) => i.status === "PENDING");
  const resolved = items.filter((i) => i.status !== "PENDING");
  // Each request is routed to (and shown under) the problem whose committee scored it.
  const problems = [...new Set(pending.map((i) => i.problemNumber))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-lg font-bold text-ink-900">{t("คำขอแก้ไขคะแนน")}</h2>
      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <div className="space-y-6">
        {pending.length === 0 && (
          <p className="text-sm text-ink-500">{t("ไม่มีคำขอค้างดำเนินการ")}</p>
        )}
        {problems.map((problem) => (
          <section key={problem} className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-ink-900">
              <span className="rounded-full bg-state-queued-bg px-3 py-0.5 text-sm text-state-queued-fg">
                {t("ข้อ {n}", { n: problem })}
              </span>
              <span className="text-xs font-normal text-ink-500">
                {t("ส่งถึงกรรมการประจำข้อ {n} · {count} คำขอ", {
                  n: problem,
                  count: pending.filter((i) => i.problemNumber === problem).length,
                })}
              </span>
            </h3>
            {pending
              .filter((i) => i.problemNumber === problem)
              .map((item) => (
                <div key={item.id} className="card-soft p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-900">
                        {item.schoolName} · {item.studentCode}{" "}
                        {item.studentName}
                      </p>
                      <p className="text-sm text-ink-500">
                        {t("ข้อ {n} · ขอโดย {name}", {
                          n: item.problemNumber,
                          name: item.requestedByDisplayName,
                        })}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-ink-900">
                      <span className="text-ink-300 line-through">
                        {item.oldValue.toFixed(2)}
                      </span>
                      {" → "}
                      <span className="text-saed-600">
                        {item.newValue.toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <p className="mb-3 text-sm text-ink-700">
                    {t("เหตุผล: {reason}", { reason: item.reason })}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => handleReview(item.id, "approve")}>
                      {t("อนุมัติ")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleReview(item.id, "reject")}
                    >
                      {t("ปฏิเสธ")}
                    </Button>
                  </div>
                </div>
              ))}
          </section>
        ))}
      </div>

      {resolved.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-ink-900">{t("ดำเนินการแล้ว")}</h3>
          <div className="card-soft divide-y divide-line p-2">
            {resolved.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 text-sm"
              >
                <span className="text-ink-700">
                  {item.schoolName} · {item.studentCode} · ข้อ{" "}
                  {item.problemNumber} · {item.oldValue.toFixed(2)} →{" "}
                  {item.newValue.toFixed(2)}
                </span>
                <span
                  className={
                    item.status === "APPROVED"
                      ? "text-state-done-fg"
                      : "text-state-active-fg"
                  }
                >
                  {t(STATUS_LABEL[item.status])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
