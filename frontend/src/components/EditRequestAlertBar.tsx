"use client";

import Link from "next/link";
import { usePendingEditRequests } from "@/lib/use-pending-edit-requests";
import { useT } from "@/lib/i18n";

/** A score-edit request as returned by GET /score-edit-requests (caller-scoped). */
export interface ScoreEditRequestItem {
  id: string;
  scoreId: string;
  oldValue: number;
  newValue: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  schoolName: string;
  studentName: string;
  studentCode: string;
  problemNumber: number;
  requestedBy: string;
  requestedByDisplayName: string;
  requestedByRole: "ADMIN" | "COMMITTEE" | "STAFF" | "TEAM_LEADER";
  createdAt: string;
}

/**
 * Red status bar shown on every page of a role's layout while at least one
 * score-edit request (raised by a mentor OR a judge) is still pending — live
 * via the SSE `changed` signal. Links to the page where it gets handled.
 */
export function EditRequestAlertBar({ href }: { href: string }) {
  const t = useT();
  const count = usePendingEditRequests().pending.length;

  if (count === 0) return null;
  return (
    <Link
      href={href}
      role="alert"
      className="sticky top-[52px] z-20 flex items-center justify-center gap-2 bg-[#c8102e] md:top-0 px-4 py-2 text-sm font-semibold text-white shadow-md print:hidden"
    >
      <span aria-hidden>⚠</span>
      {t("count_score_edit_request_s_pending_click_to", { count })}
    </Link>
  );
}
