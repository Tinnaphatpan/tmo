"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

export interface NavItem {
  href: string;
  label: string;
}

interface AppSidebarProps {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}

/** Shared role shell: fixed slate sidebar on md+, top bar + slide-over drawer
 * below that (committee works on tablets). Hidden entirely when printing. */
export function AppSidebar({ title, nav, children }: AppSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Longest-prefix match so /admin doesn't stay active on /admin/schools.
  const activeHref = nav
    .filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const links = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      {nav.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`touch-target rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-saed-500 text-white"
                : "text-ink-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const panel = (
    <>
      <div className="px-5 py-4 text-lg font-bold text-white">{title}</div>
      {links}
      <div className="border-t border-white/10 p-3 [&_button]:w-full [&_button]:text-ink-300">
        <LogoutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-56 shrink-0 flex-col bg-ink-900 md:sticky md:top-0 md:flex md:h-screen print:hidden">
        {panel}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-2 md:hidden print:hidden">
        <span className="font-bold text-white">{title}</span>
        <button
          type="button"
          aria-label="เมนู"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="touch-target rounded-lg px-3 text-xl text-white hover:bg-white/10"
        >
          ☰
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <button
            type="button"
            aria-label="ปิดเมนู"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-ink-900">{panel}</aside>
        </div>
      )}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
