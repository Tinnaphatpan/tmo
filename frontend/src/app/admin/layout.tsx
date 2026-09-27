import { AppSidebar } from "@/components/layout/AppSidebar";
import { requireRole } from "@/lib/session";

const NAV = [
  { href: "/admin", label: "overview" },
  { href: "/admin/schools", label: "schools" },
  { href: "/admin/committee", label: "users_permissions" },
  { href: "/admin/students", label: "students" },
  { href: "/admin/queue", label: "queue" },
  { href: "/admin/scores", label: "score" },
  { href: "/admin/audit-log", label: "history" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return (
    <AppSidebar title="administrator" nav={NAV}>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </AppSidebar>
  );
}
