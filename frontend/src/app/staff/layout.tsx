import { AppSidebar, type NavItem } from "@/components/layout/AppSidebar";
import { Watermark } from "@/components/Watermark";
import { EditRequestAlertBar } from "@/components/EditRequestAlertBar";
import { requireRole } from "@/lib/session";

const STAFF_NAV: NavItem[] = [
  { href: "/staff", label: "manage_queue", icon: "queue" },
  { href: "/staff/scoreboard", label: "scoreboard", icon: "scoreboard" },
  { href: "/staff/score-edit-requests", label: "score_edit_requests", icon: "edit" },
];
// An ADMIN lands here only after claiming a specific item from admin/queue's
// own table (school/problem/time picker) — this page is just the grading
// workspace (Call Next/Skip/Score) from then on, so give them a link back
// to that table rather than the STAFF-only scoreboard/score-edit-requests
// (still ADMIN-inaccessible at the backend's RolesGuard).
const ADMIN_NAV: NavItem[] = [{ href: "/admin/queue", label: "back_to_queue", icon: "queue" }];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["STAFF", "ADMIN"]);
  const isAdmin = session.role === "ADMIN";
  const stamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  return (
    <>
      <Watermark displayName={session.displayName} role={session.role} stamp={stamp} />
      <AppSidebar title={isAdmin ? "administrator" : "staff"} nav={isAdmin ? ADMIN_NAV : STAFF_NAV}>
        {!isAdmin && <EditRequestAlertBar href="/staff/score-edit-requests" />}
        {children}
      </AppSidebar>
    </>
  );
}
