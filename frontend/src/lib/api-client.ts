import axios from "axios";

/**
 * Browser-side client. Always calls same-origin `/api/bff/*`, which proxies
 * to NestJS with the JWT attached server-side (SPEC §1.2/§2.2) — the browser
 * never handles the token directly, just this cookie-authenticated call.
 */
export const api = axios.create({
  baseURL: "/api/bff",
  withCredentials: true,
});

export interface ApiErrorBody {
  error: string;
}

/** SPEC §2.5 — every endpoint fails with `{ error: string }`; this pulls that out uniformly. */
export function getApiErrorMessage(err: unknown, fallback = "เกิดข้อผิดพลาด"): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error) return body.error;
  }
  return fallback;
}
