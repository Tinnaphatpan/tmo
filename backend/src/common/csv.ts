const BOM = '﻿';

function escapeCell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** UTF-8 BOM + CRLF rows so Excel opens Thai text correctly (SPEC §4.2/§4.3/§6). */
export function toCsv(rows: (string | number)[][]): string {
  const body = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
  return BOM + body;
}

/** RFC 5987 filename* for non-ASCII (Thai) filenames in Content-Disposition (SPEC §4.4). */
export function contentDispositionFilename(filename: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
