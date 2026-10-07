import { describe, expect, it } from "vitest";
import { actionLabel, describeChange, describeSubject, AuditLogEntry } from "./audit-log";

const base: AuditLogEntry = {
  id: "1",
  action: "SCORE_UPDATED",
  entityType: "Score",
  entityId: "x",
  changes: [],
  performedByDisplayName: "a",
  createdAt: "2026-09-24T12:00:00Z",
  studentName: null,
  schoolName: null,
  problemNumber: null,
  targetUserName: null,
};

describe("audit-log formatting", () => {
  it("translates canonical and legacy action names", () => {
    expect(actionLabel("SCORE_CREATED")).toBe("บันทึกคะแนน");
    expect(actionLabel("score.create")).toBe("บันทึกคะแนน");
    expect(actionLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("describes score changes and their subject", () => {
    const e = { ...base, changes: [{ fieldName: "value", oldValue: "5.00", newValue: "9.50" }], studentName: "สมชาย", schoolName: "A", problemNumber: 2 };
    expect(describeChange(e)).toBe("คะแนน 5 → 9.5");
    expect(describeSubject(e)).toBe("นักเรียน สมชาย · โรงเรียน A · ข้อ 2");
    expect(describeChange({ ...e, changes: [{ fieldName: "value", oldValue: null, newValue: "9.50" }] })).toBe("คะแนน 9.5");
    expect(describeSubject(base)).toBeNull();
  });

  it("describes schedule generation and role changes from JSON", () => {
    const sched = {
      ...base,
      action: "QUEUE_SCHEDULE_GENERATED",
      entityType: "Queue",
      changes: [
        { fieldName: "date", oldValue: null, newValue: "2026-09-24" },
        { fieldName: "created", oldValue: null, newValue: "75" },
        { fieldName: "updated", oldValue: null, newValue: "5" },
        { fieldName: "total", oldValue: null, newValue: "80" },
      ],
    };
    expect(describeChange(sched)).toContain("สร้างใหม่ 75");
    const role = {
      ...base,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      changes: [
        { fieldName: "role", oldValue: "COMMITTEE", newValue: "TEAM_LEADER" },
        { fieldName: "assignment", oldValue: "1:*", newValue: null },
      ],
    };
    expect(describeChange(role)).toBe("บทบาท กรรมการ → หัวหน้าทีม");
    const plain = { ...base, entityType: "Other", action: "X", changes: [{ fieldName: "value", oldValue: "1", newValue: "2" }] };
    expect(describeChange({ ...plain, changes: [...plain.changes, { fieldName: "other", oldValue: "a", newValue: "b" }] })).toBe("value: 1 → 2, other: a → b");
  });
});
