"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MentorScoreTable } from "@/components/MentorScoreTable";
import { useTeamLeaderReport } from "@/lib/use-team-leader-report";

interface PendingItem {
  id: string;
  problemNumber: number;
  schoolName: string;
}

interface Approved {
  id: string;
  problemNumber: number;
}

export default function TeamLeaderApprovalsPage() {
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [approved, setApproved] = useState<Approved[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { report } = useTeamLeaderReport();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<PendingItem[]>("/team-leader/approvals");
      setPending(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "โหลดรายการรออนุมัติไม่สำเร็จ"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(item: PendingItem) {
    setError(null);
    setBusyId(item.id);
    try {
      await api.post(`/team-leader/approvals/${item.id}/approve`);
      setApproved((prev) => [{ id: item.id, problemNumber: item.problemNumber }, ...prev]);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "อนุมัติไม่สำเร็จ"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4">
      <header className="mx-auto mb-4 max-w-3xl">
        <h1 className="text-lg font-bold text-ink-900">อนุมัติคะแนน</h1>
        {report && <p className="text-sm text-ink-500">{report.schoolName}</p>}
      </header>

      <div className="mx-auto max-w-3xl space-y-6">
        {error && (
          <p className="rounded-lg bg-state-active-bg px-4 py-2 text-sm text-state-active-fg">
            {error}
          </p>
        )}

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">รออนุมัติ</h2>
          {pending === null && !error && <p className="text-sm text-ink-500">กำลังโหลด...</p>}
          {pending?.length === 0 && (
            <p className="text-sm text-ink-500">ไม่มีรายการรออนุมัติ</p>
          )}
          <ul className="divide-y divide-line">
            {pending?.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-ink-900">ข้อ {item.problemNumber}</p>
                  <div className="mt-1">
                    <StatusBadge status="PENDING_APPROVAL" />
                  </div>
                </div>
                <Button onClick={() => approve(item)} disabled={busyId !== null}>
                  {busyId === item.id ? "กำลังอนุมัติ..." : "อนุมัติและลงนาม"}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        {approved.length > 0 && (
          <section className="card-soft p-5">
            <h2 className="mb-3 font-semibold text-ink-900">อนุมัติแล้วในเซสชันนี้</h2>
            <ul className="divide-y divide-line">
              {approved.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink-900">ข้อ {item.problemNumber}</span>
                    <StatusBadge status="APPROVED" />
                  </div>
                  {/* File download, not a page — next/link's client-side nav doesn't apply. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a
                    href={`/api/bff/team-leader/approvals/${item.id}/document`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-saed-600 hover:underline"
                  >
                    ดู PDF
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {report && (
          <section className="card-soft overflow-x-auto p-2">
            <MentorScoreTable report={report} />
          </section>
        )}
      </div>
    </div>
  );
}
