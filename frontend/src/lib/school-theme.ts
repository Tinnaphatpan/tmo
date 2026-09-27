/** Accent colour per centre (sampled from each logo) — tints the mentor's pages. */
const SCHOOL_COLOR: Record<string, string> = {
  CMU: "#7c4a9c",
  KKU: "#a83b24",
  SU: "#2f8f86",
  "SA-SWU": "#4f8fb8",
  WU: "#6a45a0",
  MWIT: "#1d4394",
  PSUHY: "#b89a06",
  "YB-KU": "#d94a98",
  KMUTNB: "#a63a2e",
  RS: "#e07a2f",
  PSUPN: "#b89a06",
  NU: "#8a6a4a",
  AFAPS: "#b21025",
  BUU: "#b89a1f",
  UBU: "#8a9430",
  "SK-KMUTT": "#1f8fd0",
};

const FALLBACK = "#64748b";

export function schoolColor(code: string | null | undefined): string {
  return (code && SCHOOL_COLOR[code]) || FALLBACK;
}

/** Soft page background in the school's colour (light enough for dark text). */
export function schoolTint(code: string | null | undefined): string {
  return `color-mix(in srgb, ${schoolColor(code)} 16%, #ffffff)`;
}
