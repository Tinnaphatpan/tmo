import { AppSidebar } from "@/components/layout/AppSidebar";

const NAV = [
  { href: "/team-leader", label: "คะแนนนักเรียน" },
  { href: "/team-leader/approvals", label: "อนุมัติคะแนน" },
];

export default function TeamLeaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSidebar title="หัวหน้าทีม" nav={NAV}>
      {children}
    </AppSidebar>
  );
}
