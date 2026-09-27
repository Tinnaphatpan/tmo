import { Inbox, type LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon = Inbox, text }: { icon?: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-ink-300">
      <Icon className="h-9 w-9" strokeWidth={1.5} aria-hidden />
      <p className="text-sm text-ink-500">{text}</p>
    </div>
  );
}
