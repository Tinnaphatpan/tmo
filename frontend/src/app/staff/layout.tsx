import { AppSidebar } from "@/components/layout/AppSidebar";
import { Watermark } from "@/components/Watermark";
import { getSession } from "@/lib/session";

const NAV = [
  { href: "/staff", label: "จัดการคิว" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const stamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  return (
    <>
      {session && (
        <Watermark displayName={session.displayName} role={session.role} stamp={stamp} />
      )}
      <AppSidebar title="เจ้าหน้าที่" nav={NAV}>
        {children}
      </AppSidebar>
    </>
  );
}
