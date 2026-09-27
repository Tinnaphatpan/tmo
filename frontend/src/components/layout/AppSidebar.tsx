"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { LocaleSwitcher } from "@/lib/i18n";
import { LogoutButton } from "@/components/LogoutButton";
import { NAV_ICONS, type NavIconName } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  icon?: NavIconName;
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
      <img src="/icon.png" alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-white object-contain" />
      <span className="text-base font-bold tracking-tight text-white">{title}</span>
    </div>
  );
}

export function AppSidebar({ title, nav, children }: AppSidebarProps) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeHref = nav
    .filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const links = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-2">
      {nav.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon ? NAV_ICONS[item.icon] : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`touch-target flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out ${
              active
                ? "nav-active text-white"
                : "text-ink-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {Icon && <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />}
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );

  const panel = (
    <>
      <div className="px-5 py-5">
        <Brand title={t(title)} />
      </div>
      {links}
      <div className="border-t border-white/10 p-3 [&_button]:w-full [&_button]:text-ink-300 [&_button:hover]:text-white">
        <div className="mb-2 px-1">
          <LocaleSwitcher tone="dark" />
        </div>
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
        <Brand title={t(title)} />
        <button
          type="button"
          aria-label={t("menu")}
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
            aria-label={t("close_menu")}
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
