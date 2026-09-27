"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { LocaleSwitcher, useT } from "@/lib/i18n";
import { usePublicQueue } from "@/lib/use-public-queue";
import { ProblemStatusCards } from "@/components/ProblemStatusCards";
import {
  QueueBoardTable,
  boardBanner,
  buildBoardRows,
} from "@/components/QueueBoardTable";

export default function PublicQueuePage() {
  const t = useT();
  const data = usePublicQueue();
  const rows = data ? buildBoardRows(data, t) : [];

  return (
    <div className="queue-board min-h-screen bg-[var(--qb-page)]">
      <header className="relative border-b border-black/10 bg-white py-4 text-center">
        <h1 className="text-[17px] font-bold text-ink-900">TMO Dashboard</h1>
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <LocaleSwitcher />
        </div>
        <Link
          href="/login"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--qb-banner-fg)] underline"
        >
          {t("sign_in")}
        </Link>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
        {data && (
          <section>
            <h2 className="mb-3 px-1 text-xl font-bold text-ink-900">
              {t("status_of_each_problem")}
            </h2>
            <ProblemStatusCards data={data} />
          </section>
        )}

        <section className="rounded-[28px] bg-[var(--qb-card)] p-3 shadow-[0_2px_10px_rgba(60,50,30,0.08)] sm:p-6">
          <h2 className="mb-4 text-2xl font-bold text-ink-900">
            {t("full_queue_table")}
          </h2>

          {!data ? (
            <PageSkeleton rows={8} />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-ink-500">
              {t("no_queue_schedule_yet")}
            </p>
          ) : (
            <QueueBoardTable
              rows={rows}
              problemNumbers={data.problemNumbers}
              banner={boardBanner(data.slots, t)}
            />
          )}

          {data && (
            <p className="mt-4 text-sm text-ink-500">
              {t("w_waiting_p_in_progress_d_done_of_t", {
                w: data.counts.waiting,
                p: data.counts.inProgress,
                d: data.counts.done,
                t: data.counts.total,
              })}
              <a
                href="/api/bff/schedule/export"
                className="ml-3 text-[var(--qb-banner-fg)] underline"
              >
                {t("download_schedule_csv")}
              </a>
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
