import { useT } from "@/lib/i18n";
import { SchoolLogo } from "@/components/SchoolLogo";
import type { PublicQueueResult } from "@/lib/types";

type Item = PublicQueueResult["items"][number];

/** Waiting order: scheduled time first (when present), then queue position. */
function byOrder(a: Item, b: Item) {
  if (a.scheduledAt && b.scheduledAt && a.scheduledAt !== b.scheduledAt) {
    return a.scheduledAt < b.scheduledAt ? -1 : 1;
  }
  return a.position - b.position;
}

/** Numbered chips "1 2 3 …" — anonymous, the public board never shows student names. */
function StudentNumbers({ count, tone }: { count: number; tone: string }) {
  const t = useT();
  if (count <= 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-ink-500">{t("student_no")}</span>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums ${tone}`}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

/** Per-problem live status: who is being graded now, who is next, and progress. */
export function ProblemStatusCards({ data }: { data: PublicQueueResult }) {
  const t = useT();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.problemNumbers.map((problem) => {
        const items = data.items.filter((i) => i.problemNumber === problem);
        const current =
          items.filter((i) => i.status === "IN_PROGRESS").sort(byOrder)[0] ??
          null;
        const next =
          items.filter((i) => i.status === "WAITING").sort(byOrder)[0] ?? null;
        const stats = data.byProblem.find((p) => p.problemNumber === problem);
        const total = stats?.total ?? items.length;
        const done =
          stats?.done ?? items.filter((i) => i.status === "DONE").length;
        const finished = total > 0 && done === total;

        return (
          <article
            key={problem}
            className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_2px_10px_rgba(60,50,30,0.08)]"
          >
            <header className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-4 py-2.5 text-orange-800">
              <h3 className="font-bold">{t("problem_n", { n: problem })}</h3>
              {current && !finished && (
                <SchoolLogo code={current.school.code} size={36} />
              )}
            </header>

            <div className="space-y-3 p-4">
              <div>
                <p className="text-xs font-medium text-ink-500">
                  {t("right_now")}
                </p>
                {finished ? (
                  <p className="mt-1 inline-flex rounded-full border border-state-done-border bg-state-done-bg px-3 py-1 text-sm font-medium text-state-done-fg">
                    {t("all_schools_graded")}
                  </p>
                ) : current ? (
                  <div>
                    <div className="mt-1 flex items-center gap-2.5">
                      <div className="text-base font-semibold leading-tight text-ink-900">
                        <span className="block text-xs font-medium text-blue-600">
                          <span className="animate-soft-pulse mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-500" />
                          {t("in_progress")}
                        </span>
                        {current.school.name}
                      </div>
                    </div>
                    <StudentNumbers
                      count={current.school.studentCount ?? 0}
                      tone="bg-blue-100 text-blue-700"
                    />
                  </div>
                ) : (
                  <p className="mt-1 inline-flex rounded-full border border-state-queued-border bg-state-queued-bg px-3 py-1 text-sm font-medium text-state-queued-fg">
                    {t("waiting_for_a_judge")}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-[var(--qb-head)] px-3 py-2">
                <p className="text-xs font-medium text-ink-500">
                  {t("next_school")}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-ink-900">
                  {next && <SchoolLogo code={next.school.code} size={28} />}
                  {next ? next.school.name : t("nobody_waiting")}
                </p>
                {next && (
                  <StudentNumbers
                    count={next.school.studentCount ?? 0}
                    tone="bg-white text-ink-700 ring-1 ring-black/10"
                  />
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
