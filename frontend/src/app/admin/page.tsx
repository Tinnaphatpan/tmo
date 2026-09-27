"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
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

const TONES = {
  amber: "from-yellow-300 to-yellow-500",
  crimson: "from-blue-400 to-blue-600",
  green: "from-green-400 to-green-600",
  slate: "from-slate-300 to-slate-400",
} as const;

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="card-soft relative overflow-hidden p-4 pl-5">
      <span
        className={`absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b ${TONES[tone]}`}
      />
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">
        {value}
      </p>
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">{t("system_overview")}</h2>
        <Button
          variant={data.scoringLocked ? "secondary" : "danger"}
          disabled={toggling}
          onClick={handleToggleLock}
        >
          {data.scoringLocked ? t("unlock_scoring") : t("close_scoring_system_wide")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          tone="amber"
          label={t("waiting")}
          value={data.queueCounts.waiting}
        />
        <StatCard
          tone="crimson"
          label={t("in_progress")}
          value={data.queueCounts.inProgress}
        />
        <StatCard tone="green" label={t("done")} value={data.queueCounts.done} />
        <StatCard label={t("schools")} value={data.schoolCount} />
        <StatCard label={t("committee")} value={data.committeeCount} />
        <StatCard label={t("students")} value={data.studentCount} />
        <StatCard label={t("fully_scored")} value={data.schoolsFullyScored} />
        <StatCard label={t("pending_edit_requests")} value={data.pendingEditRequestCount} />
      </div>

      <section className="space-y-3">
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
