import { AppSidebar } from "@/components/layout/AppSidebar";
import { Watermark } from "@/components/Watermark";
import { EditRequestAlertBar } from "@/components/EditRequestAlertBar";
import { requireRole } from "@/lib/session";

const NAV = [
  { href: "/committee", label: "grading" },
  { href: "/committee/scoreboard", label: "scoreboard" },
  { href: "/committee/score-edit-requests", label: "score_edit_requests" },
];

export default async function CommitteeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("COMMITTEE");
  const stamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  return (
    <>
      <Watermark displayName={session.displayName} role={session.role} stamp={stamp} />
      <AppSidebar title="committee" nav={NAV}>
        <EditRequestAlertBar href="/committee/score-edit-requests" />
        {children}
      </AppSidebar>
    </>
  );
}
