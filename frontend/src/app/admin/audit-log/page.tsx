"use client";

import { History } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  AUDIT_ACTION_OPTIONS,
  AuditLogPage,
  actionLabel,
  describeChange,
  describeSubject,
  entityLabel,
} from "@/lib/audit-log";

import { useT } from "@/lib/i18n";
const PAGE_SIZE = 50;

export default function AdminAuditLogPage() {
  const t = useT();
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AuditLogPage>("/admin/audit-log", {
        params: { limit: PAGE_SIZE, offset: page * PAGE_SIZE, action, q: search },
      })
      .then(({ data: res }) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t("failed_to_load_data")));
      });
    return () => {
      cancelled = true;
    };
  }, [action, search, page]);

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader icon={History} title={t("edit_history")} />

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label={t("filter_by_action")}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(0);
          }}
        >
          <option value="">{t("all_actions")}</option>
          {AUDIT_ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a, t)}
            </option>
          ))}
        </select>
        <input
          type="search"
          aria-label={t("search")}
          placeholder={t("search_by_actor_student_school")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="min-w-64 flex-1"
        />
      </div>

      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      {!data && !error ? (
        <PageSkeleton />
      ) : (
        data && (
          <>
            <div className="card-soft divide-y divide-line p-2">
              {data.items.length === 0 && (
                <p className="p-3 text-sm text-ink-500">{t("no_entries_found")}</p>
              )}
              {data.items.map((entry) => {
                const subject = describeSubject(entry, t);
                const change = describeChange(entry, t);
                return (
                  <div key={entry.id} className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink-900">
                        {actionLabel(entry.action, t)}
                        <span className="ml-2 text-xs font-normal text-ink-500">
                          {entityLabel(entry.entityType, t)}
                        </span>
                      </span>
                      <span className="shrink-0 text-ink-500">
                        {new Date(entry.createdAt).toLocaleString("th-TH")}
                      </span>
                    </div>
                    {subject && <p className="text-ink-700">{subject}</p>}
                    {change && <p className="text-ink-700">{change}</p>}
                    <p className="text-ink-500">{t("by_name", { name: entry.performedByDisplayName })}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-sm text-ink-500">
              <span>
                {t("total_entries_page_page_pages", { total: total.toLocaleString("th-TH"), page: page + 1, pages: pageCount })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t("previous")}
                </Button>
                <Button
                  variant="secondary"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
