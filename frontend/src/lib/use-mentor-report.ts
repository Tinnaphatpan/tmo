"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export interface MentorReportRow {
  studentCode: string;
  name: string;
  scores: (number | null)[];
  total: number;
}

export interface MentorReport {
  schoolName: string;
  rows: MentorReportRow[];
  grandTotal: number;
}

export function useMentorReport() {
  const [report, setReport] = useState<MentorReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<MentorReport>("/mentor/report")
      .then(({ data }) => setReport(data))
      .catch(() => setError("โหลดข้อมูลไม่สำเร็จ"));
  }, []);

  return { report, error };
}
