import { AppSidebar } from "@/components/layout/AppSidebar";
import { Watermark } from "@/components/Watermark";
import { EditRequestAlertBar } from "@/components/EditRequestAlertBar";
import { requireRole } from "@/lib/session";

const NAV = [
  { href: "/staff", label: "manage_queue" },
  { href: "/staff/scoreboard", label: "scoreboard" },
  { href: "/staff/score-edit-requests", label: "score_edit_requests" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("STAFF");
  const stamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  return (
    <>
      <Watermark displayName={session.displayName} role={session.role} stamp={stamp} />
      <AppSidebar title="staff" nav={NAV}>
        <EditRequestAlertBar href="/staff/score-edit-requests" />
        {children}
      </AppSidebar>
    </>
  );
}
