import { AppSidebar } from "@/components/layout/AppSidebar";

const NAV = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/schools", label: "โรงเรียน" },
  { href: "/admin/committee", label: "กรรมการ" },
  { href: "/admin/students", label: "นักเรียน" },
  { href: "/admin/queue", label: "คิว" },
  { href: "/admin/scores", label: "คะแนน" },
  { href: "/admin/score-edit-requests", label: "คำขอแก้ไข" },
  { href: "/admin/audit-log", label: "ประวัติ" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSidebar title="ผู้ดูแลระบบ" nav={NAV}>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </AppSidebar>
  );
}
