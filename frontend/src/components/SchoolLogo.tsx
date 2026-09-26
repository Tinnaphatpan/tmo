/* eslint-disable @next/next/no-img-element */
const LOGO_EXT: Record<string, "png" | "jpg"> = {
  CMU: "png",
  KKU: "png",
  SU: "png",
  "SA-SWU": "jpg",
  WU: "png",
  MWIT: "jpg",
  PSUHY: "png",
  "YB-KU": "jpg",
  KMUTNB: "png",
  RS: "jpg",
  PSUPN: "jpg",
  NU: "png",
  AFAPS: "jpg",
  BUU: "png",
  UBU: "png",
  "SK-KMUTT": "png",
};

/** Centre logo in a white rounded frame (files: public/images/<code lowercased>.<ext>); initials if unknown. */
export function SchoolLogo({
  code,
  size = 28,
  className = "",
}: {
  code: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const ext = code ? LOGO_EXT[code] : undefined;
  const frame = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/10 ${className}`;
  if (!code || !ext) {
    return (
      <span
        className={`${frame} text-[10px] font-bold text-ink-500`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {(code ?? "?").slice(0, 2)}
      </span>
    );
  }
  return (
    <span className={frame} style={{ width: size, height: size }}>
      <img
        src={`/images/${code.toLowerCase()}.${ext}`}
        alt=""
        loading="lazy"
        className="h-full w-full object-contain p-[7%]"
      />
    </span>
  );
}
