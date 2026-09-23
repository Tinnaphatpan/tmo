import { AppSidebar } from "@/components/layout/AppSidebar";

const NAV = [
  { href: "/staff", label: "จัดการคิว" },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSidebar title="เจ้าหน้าที่" nav={NAV}>
      {children}
    </AppSidebar>
  );
}
