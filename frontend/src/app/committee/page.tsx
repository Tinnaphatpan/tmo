"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";
import type { MyQueueItem, MyQueueResult } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useT } from "@/lib/i18n";
import { SchoolLogo } from "@/components/SchoolLogo";
import { Button } from "@/components/ui/Button";
import { ScoreForm } from "@/components/ScoreForm";
import { ScoreEditRequestModal } from "@/app/committee/_components/ScoreEditRequestModal";

const UPCOMING_LIMIT = 3;

export default function CommitteePage() {
  const t = useT();
  const [data, setData] = useState<MyQueueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [editModal, setEditModal] = useState<{
    item: MyQueueItem;
    studentId: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<MyQueueResult>("/queue/mine");
      setData(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, t("โหลดข้อมูลไม่สำเร็จ")));
    }
  }, [t]);

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
      setActionError(getApiErrorMessage(err, t("รับตรวจไม่สำเร็จ")));
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
      setActionError(getApiErrorMessage(err, t("คืนคิวไม่สำเร็จ")));
    }
  }

  if (error) {
    return <div className="p-6 text-state-active-fg">{error}</div>;
  }
  if (!data) {
    return <PageSkeleton />;
  }

  const current = data.items.find((i) => i.id === data.currentItemId) ?? null;
  const waitingAll = data.items
    .filter((i) => i.status === "WAITING")
    .sort((a, b) => a.position - b.position);
  // Only the next few are announced ahead of time.
  const waiting = waitingAll.slice(0, UPCOMING_LIMIT);
  const nextItem = waitingAll[0] ?? null;
  const others = data.items.filter(
    (i) => i.status === "IN_PROGRESS" && i.id !== data.currentItemId,
  );
  const done = data.items.filter((i) => i.status === "DONE");
  const holdingAnother = data.currentItemId !== null;

  return (
    <div className="px-4 py-6">
      <header className="mx-auto mb-6 max-w-4xl">
        <div>
          <h1 className="text-lg font-bold text-ink-900">{t("แผงกรรมการ")}</h1>
          {data.scoringLocked && (
            <p className="text-sm text-state-active-fg">
              ปิดรับคะแนนแล้ว — ใช้ขอแก้ไขคะแนนแทน
            </p>
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
          <h2 className="mb-3 font-semibold text-ink-900">
            {t("กำลังตรวจอยู่")}
          </h2>
          {current ? (
            <div className="animate-fade-in">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-900">
                    <span className="inline-flex items-center gap-2">
                      <SchoolLogo code={current.school.code} size={28} />
                      {current.school.name}
                    </span>
                  </p>
                  <p className="text-sm text-ink-500">
                    {t("ข้อ {n}", { n: current.problemNumber })}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleRelease(current.id)}
                >
                  คืนคิว
                </Button>
              </div>
              <ScoreForm
                item={current}
                onSubmitted={() => {
                  setJustSubmitted(true);
                  load();
                }}
              />
            </div>
          ) : (
            <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-500">
                {justSubmitted
                  ? t("ส่งคะแนนเพื่อรออนุมัติจากหัวหน้าทีมแล้ว ✓")
                  : t("เลือกจากคิวรอตรวจด้านล่าง")}
              </p>
              {nextItem && (
                <Button
                  variant="next"
                  disabled={claimingId === nextItem.id}
                  onClick={() => {
                    setJustSubmitted(false);
                    handleClaim(nextItem.id);
                  }}
                >
                  {claimingId === nextItem.id
                    ? t("กำลังรับ...")
                    : t("คิวถัดไป: {school} ข้อ {n} →", {
                        school: nextItem.school.name,
                        n: nextItem.problemNumber,
                      })}
                </Button>
              )}
            </div>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 flex items-center justify-between font-semibold text-ink-900">
            <span>{t("คิวถัดไป")}</span>
            {waitingAll.length > UPCOMING_LIMIT && (
              <span className="text-xs font-normal text-ink-500">
                {t("แสดง {shown} จาก {total} คิว", {
                  shown: UPCOMING_LIMIT,
                  total: waitingAll.length,
                })}
              </span>
            )}
          </h2>
          {waiting.length === 0 ? (
            <p className="text-sm text-ink-500">{t("ไม่มีคิวรอตรวจ")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {waiting.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-ink-900">
                      <span className="inline-flex items-center gap-2">
                        <SchoolLogo code={item.school.code} size={28} />
                        {item.school.name}
                      </span>
                    </p>
                    <p className="text-sm text-ink-500">
                      {t("ข้อ {n}", { n: item.problemNumber })}
                    </p>
                  </div>
                  <Button
                    variant="next"
                    disabled={holdingAnother || claimingId === item.id}
                    onClick={() => handleClaim(item.id)}
                  >
                    {claimingId === item.id ? t("กำลังรับ...") : t("รับตรวจ")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">
            {t("กรรมการท่านอื่นกำลังตรวจ")}
          </h2>
          {others.length === 0 ? (
            <p className="text-sm text-ink-500">{t("ไม่มีรายการ")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {others.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-ink-900">
                      <span className="inline-flex items-center gap-2">
                        <SchoolLogo code={item.school.code} size={28} />
                        {item.school.name}
                      </span>
                    </p>
                    <p className="text-sm text-ink-500">
                      {t("ข้อ {n}", { n: item.problemNumber })}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">{t("ตรวจแล้ว")}</h2>
          {done.length === 0 ? (
            <p className="text-sm text-ink-500">
              {t("ยังไม่มีรายการที่ตรวจเสร็จ")}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {done.map((item) => {
                const total = item.scores.reduce((sum, s) => sum + s.value, 0);
                return (
                  <li key={item.id} className="py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink-900">
                          <span className="inline-flex items-center gap-2">
                            <SchoolLogo code={item.school.code} size={28} />
                            {item.school.name}
                          </span>
                        </p>
                        <p className="text-sm text-ink-500">
                          {t("ข้อ {n} · รวม {total} คะแนน", {
                            n: item.problemNumber,
                            total: total.toFixed(2),
                          })}
                        </p>
                      </div>
                      <StatusBadge
                        status={
                          item.approvalStatus === "APPROVED"
                            ? "APPROVED"
                            : "PENDING_APPROVAL"
                        }
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
                              onClick={() =>
                                setEditModal({ item, studentId: student.id })
                              }
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
