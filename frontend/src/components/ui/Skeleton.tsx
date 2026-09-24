/** Shimmering placeholder block; size it with `className` (h-*, w-*). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

/**
 * Stand-in for a page whose data is still loading: holds roughly the final
 * height so the layout doesn't jump when the content arrives. The words stay
 * in the DOM for screen readers (and tests) via `sr-only`.
 */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" className="space-y-3 p-4">
      <span className="sr-only">กำลังโหลด...</span>
      <Skeleton className="h-7 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
