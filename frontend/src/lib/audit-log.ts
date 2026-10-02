import { plainT, type Tr } from "@/lib/i18n/format";
export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
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

function parseJson(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
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
  const { oldValue, newValue } = entry;

  if (entry.entityType === "Score") {
    if (oldValue === null && newValue === null) return null;
    return oldValue === null
      ? t("score_v", { v: formatScore(newValue) })
      : t("score_from_to", { from: formatScore(oldValue), to: formatScore(newValue) });
  }

  if (entry.action === "QUEUE_SCHEDULE_GENERATED") {
    const after = parseJson(newValue);
    if (after && typeof after.date === "string") {
      return t("generated_the_queue_schedule_for_date_create", {
        date: formatThaiDate(after.date, t),
        created: Number(after.created ?? 0),
        updated: Number(after.updated ?? 0),
        total: Number(after.total ?? 0),
      });
    }
  }

  if (entry.action === "USER_ROLE_CHANGED") {
    const before = parseJson(oldValue);
    const after = parseJson(newValue);
    if (before && after) {
      const role = (r: unknown) => (ROLE_LABELS[String(r)] ? t(ROLE_LABELS[String(r)]) : String(r));
      return t("role_from_to", { from: role(before.role), to: role(after.role) });
    }
  }

  if (oldValue === null && newValue === null) return null;
  return `${oldValue ?? "-"} → ${newValue ?? "-"}`;
}
