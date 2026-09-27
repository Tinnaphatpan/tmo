"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api-client";

export interface TeamLeaderReportRow {
  studentCode: string;
  name: string;
  scores: (number | null)[];
  /** Score ids in the same order as `scores` (null = not scored yet). */
  scoreIds: (string | null)[];
  total: number;
}

export interface TeamLeaderReport {
  schoolName: string;
  schoolCode: string | null;
  rows: TeamLeaderReportRow[];
  grandTotal: number;
}

export function useTeamLeaderReport() {
  const t = useT();
  const [report, setReport] = useState<TeamLeaderReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<TeamLeaderReport>("/team-leader/report")
      .then(({ data }) => setReport(data))
      .catch(() => setError(t("failed_to_load_data")));
  }, [t]);

  return { report, error };
}
