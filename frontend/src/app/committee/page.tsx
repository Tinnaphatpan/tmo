"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";
import type { MyQueueItem, MyQueueResult } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ScoreForm } from "@/components/ScoreForm";
import { ScoreEditRequestModal } from "@/components/ScoreEditRequestModal";

export default function CommitteePage() {
  const [data, setData] = useState<MyQueueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ item: MyQueueItem; studentId: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<MyQueueResult>("/queue/mine");
      setData(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useQueueStream(load);

  async function handleClaim(id: string) {
    setActionError(null);
    setClaimingId(id);
    try {
      await api.post(`/queue/${id}/claim`);
      await load();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "รับตรวจไม่สำเร็จ"));
    } finally {
      setClaimingId(null);
    }
  }

  async function handleRelease(id: string) {
    setActionError(null);
    try {
      await api.post(`/queue/${id}/release`);
      await load();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "คืนคิวไม่สำเร็จ"));
    }
  }

  if (error) {
    return <div className="p-6 text-state-active-fg">{error}</div>;
  }
  if (!data) {
    return <PageSkeleton />;
  }

  const current = data.items.find((i) => i.id === data.currentItemId) ?? null;
  const waiting = data.items.filter((i) => i.status === "WAITING");
  const others = data.items.filter(
    (i) => i.status === "IN_PROGRESS" && i.id !== data.currentItemId,
  );
  const done = data.items.filter((i) => i.status === "DONE");
  const holdingAnother = data.currentItemId !== null;

  return (
    <div className="px-4 py-6">
      <header className="mx-auto mb-6 max-w-4xl">
        <div>
          <h1 className="text-lg font-bold text-ink-900">แผงกรรมการ</h1>
          {data.scoringLocked && (
            <p className="text-sm text-state-active-fg">ปิดรับคะแนนแล้ว — ใช้ขอแก้ไขคะแนนแทน</p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6">
        {actionError && (
          <p className="rounded-lg bg-state-active-bg px-4 py-2 text-sm text-state-active-fg">
            {actionError}
          </p>
        )}

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">กำลังตรวจอยู่</h2>
          {current ? (
            <div className="animate-fade-in">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-900">{current.school.name}</p>
                  <p className="text-sm text-ink-500">ข้อ {current.problemNumber}</p>
                </div>
                <Button variant="secondary" onClick={() => handleRelease(current.id)}>
                  คืนคิว
                </Button>
              </div>
              <ScoreForm item={current} onSubmitted={load} />
            </div>
          ) : (
            <p className="text-sm text-ink-500">เลือกจากคิวรอตรวจด้านล่าง</p>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">รอตรวจ</h2>
          {waiting.length === 0 ? (
            <p className="text-sm text-ink-500">ไม่มีรายการรอตรวจ</p>
          ) : (
            <ul className="divide-y divide-line">
              {waiting.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-ink-900">{item.school.name}</p>
                    <p className="text-sm text-ink-500">ข้อ {item.problemNumber}</p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={holdingAnother || claimingId === item.id}
                    onClick={() => handleClaim(item.id)}
                  >
                    {claimingId === item.id ? "กำลังรับ..." : "รับตรวจ"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">กรรมการท่านอื่นกำลังตรวจ</h2>
          {others.length === 0 ? (
            <p className="text-sm text-ink-500">ไม่มีรายการ</p>
          ) : (
            <ul className="divide-y divide-line">
              {others.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-ink-900">{item.school.name}</p>
                    <p className="text-sm text-ink-500">ข้อ {item.problemNumber}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">ตรวจแล้ว</h2>
          {done.length === 0 ? (
            <p className="text-sm text-ink-500">ยังไม่มีรายการที่ตรวจเสร็จ</p>
          ) : (
            <ul className="divide-y divide-line">
              {done.map((item) => {
                const total = item.scores.reduce((sum, s) => sum + s.value, 0);
                return (
                  <li key={item.id} className="py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink-900">{item.school.name}</p>
                        <p className="text-sm text-ink-500">
                          ข้อ {item.problemNumber} · รวม {total.toFixed(2)} คะแนน
                        </p>
                      </div>
                      <StatusBadge
                        status={item.approvalStatus === "APPROVED" ? "APPROVED" : "PENDING_APPROVAL"}
                      />
                    </div>
                    {data.scoringLocked && (
                      <div className="flex flex-wrap gap-2">
                        {item.school.students.map((student) => {
                          const score = item.scores.find(
                            (s) => s.studentId === student.id,
                          );
                          if (!score) return null;
                          return (
                            <button
                              key={student.id}
                              onClick={() => setEditModal({ item, studentId: student.id })}
                              className="touch-target rounded-lg border border-line bg-surface-sunken px-2 py-1 text-xs text-ink-700 hover:border-saed-400"
                            >
                              {student.studentCode}: {score.value.toFixed(2)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {editModal &&
        (() => {
          const score = editModal.item.scores.find(
            (s) => s.studentId === editModal.studentId,
          );
          const student = editModal.item.school.students.find(
            (s) => s.id === editModal.studentId,
          );
          if (!score || !student) return null;
          return (
            <ScoreEditRequestModal
              score={score}
              student={student}
              onClose={() => setEditModal(null)}
              onSubmitted={() => {
                setEditModal(null);
                load();
              }}
            />
          );
        })()}
    </div>
  );
}
