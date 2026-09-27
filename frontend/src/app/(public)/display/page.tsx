"use client";

import { usePublicQueue, useClock } from "@/lib/use-public-queue";
import { ScheduleGrid } from "./_components/ScheduleGrid";

import { useT } from "@/lib/i18n";
function ProblemCard({
  problemNumber,
  current,
  next,
}: {
  problemNumber: number;
  current?: { school: { name: string; code: string | null } };
  next?: { school: { name: string; code: string | null } };
}) {
  const t = useT();
  return (
    <div className="card-soft flex flex-col gap-2 p-4">
      <p
        className="font-bold text-saed-600"
        style={{ fontSize: "clamp(1rem, 2.2vw, 1.75rem)" }}
      >
        {t("problem_n", { n: problemNumber })}
      </p>
      {current ? (
        <div className="animate-fade-in rounded-lg bg-state-active-bg px-3 py-2">
          <p className="text-xs text-state-active-fg opacity-80">{t("in_progress")}</p>
          <p
            className="font-semibold text-state-active-fg"
            style={{ fontSize: "clamp(1rem, 2.4vw, 2rem)" }}
          >
            {current.school.name}
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink-500">
          {t("no_centre_is_being_graded")}
        </p>
      )}
      {next && (
        <p className="text-sm text-ink-500">
          {t("up_next")}: <span className="font-medium text-ink-700">{next.school.name}</span>
        </p>
      )}
    </div>
  );
}

export default function DisplayPage() {
  const t = useT();
  const data = usePublicQueue();
  const now = useClock();

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-ink-500">
        {t("loading")}
      </div>
    );
  }

  const upcomingSlots = data.slots.filter((slot) =>
    slot.cells.some((c) => c.status !== "DONE"),
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1
          className="font-bold text-ink-900"
          style={{ fontSize: "clamp(1.25rem, 3vw, 2.5rem)" }}
        >
          TMO Grading Queue
        </h1>
        <p className="font-mono text-ink-700" style={{ fontSize: "clamp(1.25rem, 3vw, 2.5rem)" }}>
          {now.toLocaleTimeString("th-TH")}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {data.problemNumbers.map((p) => {
          const forProblem = data.items.filter((i) => i.problemNumber === p);
          const current = forProblem.find((i) => i.status === "IN_PROGRESS");
          const next = forProblem
            .filter((i) => i.status === "WAITING")
            .sort((a, b) => a.position - b.position)[0];
          return (
            <ProblemCard key={p} problemNumber={p} current={current} next={next} />
          );
        })}
      </div>

      <ScheduleGrid slots={upcomingSlots} problemNumbers={data.problemNumbers} maxRows={6} />
    </div>
  );
}
