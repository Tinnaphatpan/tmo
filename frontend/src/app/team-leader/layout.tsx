import { AppSidebar } from "@/components/layout/AppSidebar";
import { Watermark } from "@/components/Watermark";
import { getSession } from "@/lib/session";

const NAV = [
  { href: "/team-leader", label: "คะแนนนักเรียน" },
  { href: "/team-leader/approvals", label: "อนุมัติคะแนน" },
  { href: "/team-leader/score-edit-requests", label: "คำขอแก้ไขคะแนน" },
];

export default async function TeamLeaderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const stamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  return (
    <>
      {session && (
        <Watermark displayName={session.displayName} role={session.role} stamp={stamp} />
      )}
      <AppSidebar title="หัวหน้าทีม" nav={NAV}>
        {children}
      </AppSidebar>
    </>
  );
}
