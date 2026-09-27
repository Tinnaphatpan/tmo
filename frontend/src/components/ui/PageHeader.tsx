import type { LucideIcon } from "lucide-react";

/** Page title with a soft crimson icon tile, optional subtitle and right-aligned actions. */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-saed-50 text-saed-600 ring-1 ring-saed-200">
          <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold leading-tight text-ink-900">{title}</h2>
          {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
