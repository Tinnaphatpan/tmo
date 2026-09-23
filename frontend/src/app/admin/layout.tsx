"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

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
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-ink-900">ผู้ดูแลระบบ</h1>
          <LogoutButton />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`touch-target whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-saed-100 text-saed-700"
                    : "text-ink-500 hover:bg-surface-sunken hover:text-ink-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
