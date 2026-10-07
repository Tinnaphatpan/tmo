import { plainT, type Tr } from "@/lib/i18n/format";
/** One changed field of an audit event; each value is atomic. */
export interface AuditLogChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: AuditLogChange[];
  performedByDisplayName: string;
  createdAt: string;
  studentName: string | null;
  schoolName: string | null;
  problemNumber: number | null;
  targetUserName: string | null;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
}

// Filter options: the canonical actions the backend writes today.
export const AUDIT_ACTION_OPTIONS = [
  "SCORE_CREATED",
  "SCORE_UPDATED",
  "SCORE_EDIT_APPROVED",
  "ADMIN_SCORE_OVERRIDE",
  "USER_ROLE_CHANGED",
  "QUEUE_SCHEDULE_GENERATED",
] as const;

const ACTION_LABELS: Record<string, string> = {
  SCORE_CREATED: "score_saved",
  SCORE_UPDATED: "score_edited",
  SCORE_EDIT_APPROVED: "score_edit_request_approved",
  ADMIN_SCORE_OVERRIDE: "admin_score_override",
  USER_ROLE_CHANGED: "user_role_changed",
  QUEUE_SCHEDULE_GENERATED: "generate_schedule",
  // Rows migrated from the old system use dotted lowercase names.
  "score.create": "score_saved",
  "score.update": "score_edited",
  "score-edit-request.approve": "score_edit_request_approved",
};

const ENTITY_LABELS: Record<string, string> = {
  Score: "score",
  User: "user",
  Queue: "queue",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "administrator",
  COMMITTEE: "committee",
  STAFF: "staff",
  TEAM_LEADER: "team_leader",
};


export function actionLabel(action: string, t: Tr = plainT): string {
  return ACTION_LABELS[action] ? t(ACTION_LABELS[action]) : action;
}

export function entityLabel(entityType: string, t: Tr = plainT): string {
  return ENTITY_LABELS[entityType] ? t(ENTITY_LABELS[entityType]) : entityType;
}

function change(entry: AuditLogEntry, fieldName: string): AuditLogChange | undefined {
  return entry.changes.find((c) => c.fieldName === fieldName);
}

function formatScore(value: string | null): string {
  if (value === null) return "-";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : value;
}

function formatThaiDate(iso: string, t: Tr): string {
  const d = new Date(`${iso}T00:00:00`);
  // the "th-TH" key translates to the English locale tag ("en-GB") in English mode
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(t("en_gb"));
}

/** What the entry is about, e.g. "นักเรียน สมชาย · โรงเรียน A · ข้อ 2". */
export function describeSubject(entry: AuditLogEntry, t: Tr = plainT): string | null {
  if (entry.entityType === "Score") {
    const parts = [
      entry.studentName && t("student_name", { name: entry.studentName }),
      entry.schoolName && t("school_name_2", { name: entry.schoolName }),
      entry.problemNumber !== null && t("problem_n", { n: entry.problemNumber }),
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  if (entry.entityType === "User" && entry.targetUserName) {
    return t("user_name", { name: entry.targetUserName });
  }
  return null;
}

/** One human-readable sentence for the change; falls back to the raw values. */
export function describeChange(entry: AuditLogEntry, t: Tr = plainT): string | null {
  if (entry.entityType === "Score") {
    const value = change(entry, "value");
    if (!value || (value.oldValue === null && value.newValue === null)) return null;
    return value.oldValue === null
      ? t("score_v", { v: formatScore(value.newValue) })
      : t("score_from_to", { from: formatScore(value.oldValue), to: formatScore(value.newValue) });
  }

  if (entry.action === "QUEUE_SCHEDULE_GENERATED") {
    const date = change(entry, "date")?.newValue;
    if (date) {
      return t("generated_the_queue_schedule_for_date_create", {
        date: formatThaiDate(date, t),
        created: Number(change(entry, "created")?.newValue ?? 0),
        updated: Number(change(entry, "updated")?.newValue ?? 0),
        total: Number(change(entry, "total")?.newValue ?? 0),
      });
    }
  }

  if (entry.action === "USER_ROLE_CHANGED") {
    const role = change(entry, "role");
    if (role) {
      const label = (r: string | null) =>
        r !== null && ROLE_LABELS[r] ? t(ROLE_LABELS[r]) : (r ?? "-");
      return t("role_from_to", { from: label(role.oldValue), to: label(role.newValue) });
    }
  }

  if (entry.changes.length === 0) return null;
  return entry.changes
    .map((c) => {
      const values = `${c.oldValue ?? "-"} → ${c.newValue ?? "-"}`;
      return entry.changes.length > 1 ? `${c.fieldName}: ${values}` : values;
    })
    .join(", ");
}
