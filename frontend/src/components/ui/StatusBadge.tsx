const LABELS: Record<string, string> = {
  WAITING: "รอตรวจ",
  IN_PROGRESS: "กำลังตรวจ",
  DONE: "ตรวจแล้ว",
};

const CLASSES: Record<string, string> = {
  WAITING: "bg-state-queued-bg text-state-queued-fg border-state-queued-border",
  IN_PROGRESS: "bg-state-active-bg text-state-active-fg border-state-active-border",
  DONE: "bg-state-done-bg text-state-done-fg border-state-done-border",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = CLASSES[status] ?? "bg-surface-sunken text-ink-500 border-line";
  const label = LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${cls}`}
    >
      {status === "IN_PROGRESS" && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-current animate-soft-pulse" />
      )}
      {label}
    </span>
  );
}
