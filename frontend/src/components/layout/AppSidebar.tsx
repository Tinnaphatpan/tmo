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

function Brand({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-white" />
      <span className="text-base font-bold tracking-tight text-white">{title}</span>
    </div>
  );
}

/** Shared role shell: sticky slate sidebar on md+, top bar + slide-over drawer
 * below that (committee works on tablets). Hidden entirely when printing.
 *
 * The desktop sidebar is `sticky` with its own fixed height and `self-start`:
 * it stays put while the page scrolls (requires <body> not to be a scroll
 * container — see globals.css), and scrolls internally if the menu is long. */
export function AppSidebar({ title, nav, children }: AppSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Longest-prefix match so /admin doesn't stay active on /admin/schools.
  const activeHref = nav
    .filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const links = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-2">
      {nav.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`touch-target rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out ${
              active
                ? "bg-saed-500 text-white shadow-[0_2px_8px_-2px_rgba(200,16,46,0.6)]"
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
      <div className="px-5 py-5">
        <Brand title={title} />
      </div>
      {links}
      <div className="border-t border-white/10 p-3 [&_button]:w-full [&_button]:text-ink-300 [&_button:hover]:text-white">
        <LogoutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-background md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-900 md:sticky md:top-0 md:flex md:h-dvh md:self-start print:hidden">
        {panel}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-2.5 md:hidden print:hidden">
        <Brand title={title} />
        <button
          type="button"
          aria-label="เมนู"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="touch-target rounded-lg px-3 text-xl text-white transition-colors hover:bg-white/10"
        >
          ☰
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <button
            type="button"
            aria-label="ปิดเมนู"
            className="animate-fade-in absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-ink-900 shadow-[var(--shadow-pop)]">
            {panel}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
