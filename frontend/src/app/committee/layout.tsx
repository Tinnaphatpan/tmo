import { AppSidebar } from "@/components/layout/AppSidebar";

const NAV = [
  { href: "/committee", label: "งานตรวจ" },
];

export default function CommitteeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSidebar title="กรรมการ" nav={NAV}>
      {children}
    </AppSidebar>
  );
}
