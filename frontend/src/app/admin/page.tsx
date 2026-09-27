"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FilePenLine,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LockOpen,
  School,
  ShieldCheck,
  type LucideIcon,
} from "@/components/ui/icons";
import type { StatusCounts } from "@/lib/types";
import { useQueueStream } from "@/lib/use-queue-stream";
import { usePublicQueue } from "@/lib/use-public-queue";
import { ProblemStatusCards } from "@/components/ProblemStatusCards";
import {
  QueueBoardTable,
  boardBanner,
  buildBoardRows,
} from "@/components/QueueBoardTable";

import { useT } from "@/lib/i18n";
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

const STATUS_TONES = {
  waiting: "bg-state-queued-bg text-state-queued-fg",
  progress: "bg-state-progress-bg text-state-progress-fg",
  done: "bg-state-done-bg text-state-done-fg",
} as const;

/** Large status card: coloured icon tile, big number, "of total" line. */
function StatusCard({
  icon: Icon,
  label,
  value,
  tone,
  caption,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: keyof typeof STATUS_TONES;
  caption: string;
}) {
  return (
    <div className="card-soft flex items-center gap-4 p-5">
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${STATUS_TONES[tone]}`}>
        <Icon className="h-7 w-7" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <p className="text-4xl font-bold leading-tight tabular-nums text-ink-900">{value}</p>
        <p className="text-xs text-ink-300">{caption}</p>
      </div>
    </div>
  );
}

/** Small neutral summary tile. */
function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <Icon className="h-5 w-5 shrink-0 text-ink-500" strokeWidth={2} aria-hidden />
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-xl font-bold tabular-nums text-ink-900">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const t = useT();
  const live = usePublicQueue();
  const rows = live ? buildBoardRows(live, t) : [];
  const [data, setData] = useState<DashboardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<DashboardResult>("/admin/dashboard");
      setData(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_load_data")));
    }
  }, []);

  // Initial fetch: setState only runs in the promise callback, not synchronously in the effect.
  useEffect(() => {
    let active = true;
    api
      .get<DashboardResult>("/admin/dashboard")
      .then(({ data }) => active && setData(data))
      .catch(
        (err) =>
          active && setError(getApiErrorMessage(err, t("failed_to_load_data"))),
      );
    return () => {
      active = false;
    };
  }, []);
  useQueueStream(load);

  async function handleToggleLock() {
    if (!data) return;
    const nextLocked = !data.scoringLocked;
    const message = nextLocked
      ? t("close_scoring_judges_will_no_longer_be_able")
      : t("re_open_scoring_confirm");
    if (!window.confirm(message)) return;

    setToggling(true);
    try {
      await api.patch("/admin/settings/lock", { locked: nextLocked });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_change_the_lock")));
    } finally {
      setToggling(false);
    }
  }

  if (error) return <p className="text-state-active-fg">{error}</p>;
  if (!data) return <PageSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title={t("system_overview")}
        actions={
          <Button
            variant={data.scoringLocked ? "secondary" : "danger"}
            disabled={toggling}
            onClick={handleToggleLock}
          >
            {data.scoringLocked ? (
              <LockOpen className="h-4 w-4" aria-hidden />
            ) : (
              <Lock className="h-4 w-4" aria-hidden />
            )}
            {data.scoringLocked ? t("unlock_scoring") : t("close_scoring_system_wide")}
          </Button>
        }
      />

      {data.pendingEditRequestCount > 0 && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-[#c8102e] px-4 py-3 text-sm font-semibold text-white shadow-md">
          <FilePenLine className="h-4 w-4 shrink-0" aria-hidden />
          {t("edit_requests_pending_banner", { count: data.pendingEditRequestCount })}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatusCard
          icon={Clock}
          tone="waiting"
          label={t("waiting")}
          value={data.queueCounts.waiting}
          caption={t("of_total_queues", { total: data.queueCounts.total })}
        />
        <StatusCard
          icon={Activity}
          tone="progress"
          label={t("in_progress")}
          value={data.queueCounts.inProgress}
          caption={t("of_total_queues", { total: data.queueCounts.total })}
        />
        <StatusCard
          icon={CheckCircle2}
          tone="done"
          label={t("done")}
          value={data.queueCounts.done}
          caption={t("of_total_queues", { total: data.queueCounts.total })}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="card-soft p-5 lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-sm font-semibold text-ink-900">{t("overall_progress")}</p>
            <p className="text-2xl font-bold tabular-nums text-ink-900">
              {data.queueCounts.total > 0
                ? Math.round((data.queueCounts.done / data.queueCounts.total) * 100)
                : 0}
              %
            </p>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-sunken">
            {data.queueCounts.total > 0 && (
              <>
                <span
                  className="bg-state-done-fg transition-[width] duration-500"
                  style={{ width: `${(data.queueCounts.done / data.queueCounts.total) * 100}%` }}
                />
                <span
                  className="bg-state-progress-fg transition-[width] duration-500"
                  style={{ width: `${(data.queueCounts.inProgress / data.queueCounts.total) * 100}%` }}
                />
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {data.queueCounts.done}/{data.queueCounts.total} · {t("of_total_queues", { total: data.queueCounts.total })}
          </p>
        </div>

        {data.pendingEditRequestCount > 0 ? (
          <div className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-[#c8102e] bg-red-50 p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#c8102e] text-white">
              <FilePenLine className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-[#c8102e]">{t("pending_edit_requests")}</p>
              <p className="text-4xl font-bold leading-tight tabular-nums text-[#c8102e]">
                {data.pendingEditRequestCount}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-line bg-surface p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-sunken text-ink-300">
              <FilePenLine className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-500">{t("pending_edit_requests")}</p>
              <p className="text-sm text-ink-300">{t("no_pending_items")}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={School} label={t("schools")} value={data.schoolCount} />
        <MiniStat icon={ShieldCheck} label={t("committee")} value={data.committeeCount} />
        <MiniStat icon={GraduationCap} label={t("students")} value={data.studentCount} />
        <MiniStat icon={ClipboardCheck} label={t("fully_scored")} value={data.schoolsFullyScored} />
      </div>

      <section className="space-y-3 border-t border-line pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink-900">{t("status_per_problem")}</h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
            <span className="animate-soft-pulse h-2 w-2 rounded-full bg-green-500" />
            Live
          </span>
        </div>
        {live ? (
          <div className="queue-board">
            <ProblemStatusCards data={live} />
          </div>
        ) : (
          <PageSkeleton rows={3} />
        )}
      </section>

      <section className="queue-board card-soft p-4 sm:p-5">
        <h3 className="mb-3 text-base font-bold text-ink-900">{t("full_queue_table")}</h3>
        {!live ? (
          <PageSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">
            {t("no_queue_schedule_yet")}
          </p>
        ) : (
          <QueueBoardTable
            rows={rows}
            problemNumbers={live.problemNumbers}
            banner={boardBanner(live.slots, t)}
          />
        )}
      </section>

      {data.staleItems.length > 0 && (
        <div className="card-soft border-l-4 border-l-saed-500 p-4">
          <h3 className="mb-2 font-semibold text-ink-900">
            {t("items_stuck_over_30_minutes_count", { count: data.staleItems.length })}
          </h3>
          <ul className="space-y-1 text-sm text-ink-700">
            {data.staleItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>
                  {item.schoolName} · {t("problem_n", { n: item.problemNumber })}
                </span>
                <a href="/admin/queue" className="text-saed-600 underline">
                  {t("go_to_queue_management")}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
