"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";
import type { MyQueueResult } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SchoolLogo } from "@/components/SchoolLogo";
import { Button } from "@/components/ui/Button";
import { ScoreForm } from "@/components/ScoreForm";

/** Staff queue management: Call Next / Skip / Mark Complete (ScoreForm) within
 * the caller's UserAssignment scope — scoping itself is enforced server-side,
 * `/queue/mine` already returns only in-scope items. */
export default function StaffPage() {
  const [data, setData] = useState<MyQueueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function act(path: string, failMessage: string) {
    setActionError(null);
    setBusy(true);
    try {
      await api.post(path);
      await load();
    } catch (err) {
      setActionError(getApiErrorMessage(err, failMessage));
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="p-6 text-state-active-fg">{error}</div>;
  if (!data) return <PageSkeleton />;

  const current = data.items.find((i) => i.id === data.currentItemId) ?? null;
  const waiting = data.items
    .filter((i) => i.status === "WAITING")
    .sort(
      (a, b) => a.position - b.position || a.problemNumber - b.problemNumber,
    );
  const next = waiting[0] ?? null;

  return (
    <div className="px-4 py-6">
      <header className="mx-auto mb-6 max-w-4xl">
        <h1 className="text-lg font-bold text-ink-900">จัดการคิว</h1>
        {data.scoringLocked && (
          <p className="text-sm text-state-active-fg">ปิดรับคะแนนแล้ว</p>
        )}
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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="inline-flex items-center gap-2 font-medium text-ink-900">
                    <SchoolLogo code={current.school.code} size={28} />
                    {current.school.name}
                  </p>
                  <p className="text-sm text-ink-500">
                    ข้อ {current.problemNumber}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      act(`/queue/${current.id}/skip`, "ข้ามคิวไม่สำเร็จ")
                    }
                  >
                    ข้ามคิว
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      act(`/queue/${current.id}/release`, "คืนคิวไม่สำเร็จ")
                    }
                  >
                    คืนคิว
                  </Button>
                </div>
              </div>
              <ScoreForm item={current} onSubmitted={load} />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-500">
                {next
                  ? `ถัดไป: ${next.school.name} · ข้อ ${next.problemNumber}`
                  : "ไม่มีรายการรอตรวจ"}
              </p>
              <Button
                disabled={busy || !next}
                onClick={() =>
                  next &&
                  act(`/queue/${next.id}/claim`, "เรียกคิวถัดไปไม่สำเร็จ")
                }
              >
                เรียกคิวถัดไป
              </Button>
            </div>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">
            รอตรวจ ({waiting.length})
          </h2>
          {waiting.length === 0 ? (
            <p className="text-sm text-ink-500">ไม่มีรายการรอตรวจ</p>
          ) : (
            <ul className="divide-y divide-line">
              {waiting.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="inline-flex items-center gap-2 font-medium text-ink-900">
                      <SchoolLogo code={item.school.code} size={28} />
                      {item.school.name}
                    </p>
                    <p className="text-sm text-ink-500">
                      ข้อ {item.problemNumber}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
