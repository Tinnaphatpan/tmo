const ROLE_LABELS: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  COMMITTEE: "กรรมการ",
  STAFF: "เจ้าหน้าที่",
  TEAM_LEADER: "หัวหน้าทีม",
};

/** Ink strength of the tiled text. Baked into the SVG (fill-opacity) rather than an
 * element `opacity`, so the browser paints one pre-blended layer instead of
 * compositing a full-screen group on every scroll frame. */
const WATERMARK_OPACITY = 0.07;

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Fixed, click-through tiled overlay of "{name} · {role} · {timestamp}" so
 * screenshots of grading screens stay attributable. Opacity comes from the
 * `WATERMARK_OPACITY`. `stamp` is supplied by the (server) layout so
 * SSR and hydration agree. */
export function Watermark({
  displayName,
  role,
  stamp,
}: {
  displayName: string;
  role: string;
  stamp: string;
}) {
  const label = escapeXml(`${displayName} · ${ROLE_LABELS[role] ?? role} · ${stamp}`);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240">` +
    `<text x="40" y="130" transform="rotate(-25 240 120)" font-size="14" ` +
    `font-family="sans-serif" fill="#0f172a" fill-opacity="${WATERMARK_OPACITY}">${label}</text></svg>`;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 print:hidden"
      style={{
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        // Own compositor layer + no paint containment leaks: scrolling never repaints it.
        contain: "strict",
        willChange: "transform",
      }}
    />
  );
}
