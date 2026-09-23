import { AppSidebar } from "@/components/layout/AppSidebar";
import { Watermark } from "@/components/Watermark";
import { requireRole } from "@/lib/session";

const NAV = [
  { href: "/committee", label: "งานตรวจ" },
  { href: "/committee/scoreboard", label: "สรุปคะแนน" },
];

export default async function CommitteeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("COMMITTEE");
  const stamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  return (
    <>
      <Watermark displayName={session.displayName} role={session.role} stamp={stamp} />
      <AppSidebar title="กรรมการ" nav={NAV}>
        {children}
      </AppSidebar>
    </>
  );
}
