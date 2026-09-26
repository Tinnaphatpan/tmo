import { useT } from "@/lib/i18n";

const LABELS: Record<string, string> = {
  WAITING: "รอตรวจ",
  IN_PROGRESS: "กำลังตรวจ",
  DONE: "ตรวจแล้ว",
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
};

const CLASSES: Record<string, string> = {
  WAITING: "bg-state-queued-bg text-state-queued-fg border-state-queued-border",
  IN_PROGRESS: "bg-state-progress-bg text-state-progress-fg border-state-progress-border",
  DONE: "bg-state-done-bg text-state-done-fg border-state-done-border",
  PENDING_APPROVAL:
    "bg-state-pending-approval-bg text-state-pending-approval-fg border-state-pending-approval-border",
  APPROVED: "bg-state-done-bg text-state-done-fg border-state-done-border",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const cls = CLASSES[status] ?? "bg-surface-sunken text-ink-500 border-line";
  const label = t(LABELS[status] ?? status);
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium ${cls}`}
    >
      {status === "IN_PROGRESS" && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-current animate-soft-pulse" />
      )}
      {label}
    </span>
  );
}
