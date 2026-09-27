import { AppSidebar } from "@/components/layout/AppSidebar";
import { Watermark } from "@/components/Watermark";
import { requireRole } from "@/lib/session";
import { MentorShell } from "@/app/team-leader/_components/MentorShell";

const NAV = [
  { href: "/team-leader", label: "student_scores" },
  { href: "/team-leader/approvals", label: "approve_scores" },
  { href: "/team-leader/score-edit-requests", label: "score_edit_requests" },
];

export default async function TeamLeaderLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("TEAM_LEADER");
  const stamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  return (
    <>
      <Watermark displayName={session.displayName} role={session.role} stamp={stamp} />
      <AppSidebar title="team_leader" nav={NAV}>
        <MentorShell>{children}</MentorShell>
      </AppSidebar>
    </>
  );
}
