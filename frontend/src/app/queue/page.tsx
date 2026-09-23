"use client";

import { usePublicQueue } from "@/lib/use-public-queue";
import { StatusBadge } from "@/components/ui/StatusBadge";

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export default function PublicQueuePage() {
  const data = usePublicQueue();

  if (!data) {
    return <div className="p-6 text-ink-500">กำลังโหลด...</div>;
  }

  const sortedItems = [...data.items].sort((a, b) => {
    if (a.problemNumber !== b.problemNumber) return a.problemNumber - b.problemNumber;
    return a.position - b.position;
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="mx-auto mb-4 max-w-3xl">
        <h1 className="text-lg font-bold text-ink-900">สถานะคิวตรวจข้อสอบ</h1>
        <p className="text-sm text-ink-500">
          รอตรวจ {data.counts.waiting} · กำลังตรวจ {data.counts.inProgress} · ตรวจแล้ว{" "}
          {data.counts.done} จากทั้งหมด {data.counts.total}
          {/* File download, not a page — next/link's client-side nav doesn't apply. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/bff/schedule/export"
            className="ml-3 text-saed-600 underline hover:text-saed-700"
          >
            ดาวน์โหลดตารางเวลา (CSV)
          </a>
        </p>
      </header>

      <div className="mx-auto max-w-3xl overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-surface-sunken text-ink-700">
              <th className="px-3 py-2 text-left font-semibold">ศูนย์สอบ</th>
              <th className="px-3 py-2 text-center font-semibold">ข้อ</th>
              <th className="px-3 py-2 text-center font-semibold">เวลา</th>
              <th className="px-3 py-2 text-center font-semibold">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sortedItems.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2 text-ink-900">{item.school.name}</td>
                <td className="px-3 py-2 text-center text-ink-700">{item.problemNumber}</td>
                <td className="px-3 py-2 text-center text-ink-500">
                  {formatTime(item.scheduledAt)}
                </td>
                <td className="px-3 py-2 text-center">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
