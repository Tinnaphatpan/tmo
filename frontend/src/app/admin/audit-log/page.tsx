"use client";

import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  performedByDisplayName: string;
  createdAt: string;
}

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AuditLogEntry[]>("/admin/audit-log")
      .then(({ data }) => setEntries(data))
      .catch((err) => setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ")));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink-900">ประวัติการแก้ไข</h2>
      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <div className="card-soft divide-y divide-line p-2">
        {entries.map((entry) => (
          <div key={entry.id} className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink-900">
                {entry.action} · {entry.entityType}
              </span>
              <span className="text-ink-500">
                {new Date(entry.createdAt).toLocaleString("th-TH")}
              </span>
            </div>
            <p className="text-ink-500">โดย {entry.performedByDisplayName}</p>
            {(entry.oldValue !== null || entry.newValue !== null) && (
              <p className="text-ink-700">
                {entry.oldValue ?? "-"} → {entry.newValue ?? "-"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
