"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export interface TeamLeaderReportRow {
  studentCode: string;
  name: string;
  scores: (number | null)[];
  total: number;
}

export interface TeamLeaderReport {
  schoolName: string;
  rows: TeamLeaderReportRow[];
  grandTotal: number;
}

export function useTeamLeaderReport() {
  const [report, setReport] = useState<TeamLeaderReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<TeamLeaderReport>("/team-leader/report")
      .then(({ data }) => setReport(data))
      .catch(() => setError("โหลดข้อมูลไม่สำเร็จ"));
  }, []);

  return { report, error };
}
