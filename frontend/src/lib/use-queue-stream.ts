"use client";

import { useEffect, useRef } from "react";

/**
 * SPEC §2.3 — browser connects directly to NestJS for SSE (not through the
 * BFF; no sensitive payload ever goes over this channel, just a signal).
 * `changed` means "go refetch via REST" — this hook never carries data
 * itself, only a callback to trigger.
 */
export function useQueueStream(onChanged: () => void): void {
  const callbackRef = useRef(onChanged);
  // Keep the ref fresh without mutating it during render (react-hooks/refs).
  useEffect(() => {
    callbackRef.current = onChanged;
  });

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const source = new EventSource(`${baseUrl}/queue/stream`);

    const handleChanged = () => callbackRef.current();
    source.addEventListener("changed", handleChanged);

    return () => {
      source.removeEventListener("changed", handleChanged);
      source.close();
    };
  }, []);
}
