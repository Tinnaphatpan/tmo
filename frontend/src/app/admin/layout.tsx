import { AppSidebar, type NavItem } from "@/components/layout/AppSidebar";
import { requireRole } from "@/lib/session";

const NAV: NavItem[] = [
  { href: "/admin", label: "overview", icon: "overview" },
  { href: "/admin/schools", label: "schools", icon: "schools" },
  { href: "/admin/committee", label: "users_permissions", icon: "users" },
  { href: "/admin/students", label: "students", icon: "students" },
  { href: "/admin/queue", label: "queue", icon: "queue" },
  { href: "/admin/scores", label: "score", icon: "scores" },
  { href: "/admin/approvals", label: "approve_scores", icon: "approve" },
  { href: "/admin/audit-log", label: "history", icon: "history" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return (
    <AppSidebar title="administrator" nav={NAV}>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </AppSidebar>
  );
}
