"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";
import type { PublicQueueResult } from "@/lib/types";

/** SPEC §2.5 GET /api/queue, kept fresh via SSE (§2.3) — shared by /display and /queue. */
export function usePublicQueue(): PublicQueueResult | null {
  const [data, setData] = useState<PublicQueueResult | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<PublicQueueResult>("/queue");
      setData(data);
    } catch {
      // keep showing the last good snapshot rather than blanking the board
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useQueueStream(load);

  return data;
}

export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
