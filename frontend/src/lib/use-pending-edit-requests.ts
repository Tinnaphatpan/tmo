"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useQueueStream } from "@/lib/use-queue-stream";
import type { ScoreEditRequestItem } from "@/components/EditRequestAlertBar";

/** Pending score-edit requests visible to the caller (live via SSE) — drives every red status strip. */
export function usePendingEditRequests() {
  const [pending, setPending] = useState<ScoreEditRequestItem[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ScoreEditRequestItem[]>("/score-edit-requests");
      setPending(data.filter((r) => r.status === "PENDING"));
    } catch {
      /* a failed poll must never block the page */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useQueueStream(load);

  const scoreIds = new Set(pending.map((r) => r.scoreId));
  return { pending, scoreIds, reload: load };
}
