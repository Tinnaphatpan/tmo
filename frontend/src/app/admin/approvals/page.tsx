"use client";

import { BadgeCheck } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useQueueStream } from "@/lib/use-queue-stream";

interface PendingScore {
  scoreId: string | null;
  studentCode: string;
  studentName: string;
  value: number | null;
}

interface PendingItem {
  id: string;
  problemNumber: number;
  schoolName: string;
  schoolCode: string | null;
  scores: PendingScore[];
}

interface Approved {
  id: string;
  problemNumber: number;
  schoolName: string;
}

export default function AdminApprovalsPage() {
  const t = useT();
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [approved, setApproved] = useState<Approved[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<PendingItem[]>("/admin/approvals");
      setPending(data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_load_the_approval_list")));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useQueueStream(load);

  async function approve(item: PendingItem) {
    setError(null);
    setBusyId(item.id);
    try {
      await api.post(`/admin/approvals/${item.id}/approve`);
      setApproved((prev) => [
        { id: item.id, problemNumber: item.problemNumber, schoolName: item.schoolName },
        ...prev,
      ]);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_approve")));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <BadgeCheck className="h-5 w-5 text-saed-600" aria-hidden />
          {t("approve_scores")}
        </h1>
        <p className="mt-1 text-xs text-ink-500">{t("admin_approvals_override_note")}</p>
      </header>

      <div className="max-w-3xl space-y-6">
        {error && (
          <p className="rounded-lg bg-state-active-bg px-4 py-2 text-sm text-state-active-fg">
            {error}
          </p>
        )}

        <section className="card-soft p-5">
          <h2 className="mb-3 font-semibold text-ink-900">{t("pending_approval_all_schools")}</h2>
          {pending === null && !error && <PageSkeleton rows={2} />}
          {pending?.length === 0 && (
            <p className="text-sm text-ink-500">{t("nothing_waiting_for_approval")}</p>
          )}
          <ul className="space-y-5">
            {pending?.map((item) => {
              const total = (item.scores ?? []).reduce((sum, sc) => sum + (sc.value ?? 0), 0);
              return (
                <li key={item.id} className="rounded-xl border-2 border-ink-900/70 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-ink-900">
                        {t("school_name_2", { name: item.schoolName })}
                        {" · "}
                        {t("problem_n", { n: item.problemNumber })}
                      </p>
                      <StatusBadge status="PENDING_APPROVAL" />
                    </div>
                    <p className="text-sm text-ink-500">
                      {t("total_total_points", { total: total.toFixed(2) })}
                    </p>
                  </div>
                  <div className="table-frame">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-ink-900 text-white">
                          <th className="border border-line px-3 py-2 text-left">{t("code")}</th>
                          <th className="border border-line px-3 py-2 text-left">{t("name")}</th>
                          <th className="border border-line px-3 py-2 text-center">{t("score")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(item.scores ?? []).map((sc) => (
                          <tr
                            key={sc.studentCode}
                            className="odd:bg-white even:bg-surface-sunken/60"
                          >
                            <td className="border border-line px-3 py-2 text-ink-900">{sc.studentCode}</td>
                            <td className="border border-line px-3 py-2 text-ink-900">{sc.studentName}</td>
                            <td className="border border-line px-3 py-2 text-center font-semibold text-ink-900">
                              {sc.value === null ? "-" : sc.value.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button onClick={() => approve(item)} disabled={busyId !== null}>
                      {busyId === item.id ? t("approving") : t("approve_sign")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {approved.length > 0 && (
          <section className="card-soft p-5">
            <h2 className="mb-3 font-semibold text-ink-900">{t("approved_in_this_session")}</h2>
            <ul className="divide-y divide-line">
              {approved.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink-900">
                      {t("school_name_2", { name: item.schoolName })}
                      {" · "}
                      {t("problem_n", { n: item.problemNumber })}
                    </span>
                    <StatusBadge status="APPROVED" />
                  </div>
                  {/* File download, not a page — next/link's client-side nav doesn't apply. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a
                    href={`/api/bff/admin/approvals/${item.id}/document`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-saed-600 hover:underline"
                  >
                    {t("view_pdf")}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
