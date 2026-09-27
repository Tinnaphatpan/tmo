import { describe, expect, it } from "vitest";
import { actionLabel, describeChange, describeSubject, AuditLogEntry } from "./audit-log";

const base: AuditLogEntry = {
  id: "1",
  action: "SCORE_UPDATED",
  entityType: "Score",
  entityId: "x",
  oldValue: null,
  newValue: null,
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
    const e = { ...base, oldValue: "5.00", newValue: "9.50", studentName: "สมชาย", schoolName: "A", problemNumber: 2 };
    expect(describeChange(e)).toBe("คะแนน 5 → 9.5");
    expect(describeSubject(e)).toBe("นักเรียน สมชาย · โรงเรียน A · ข้อ 2");
    expect(describeChange({ ...e, oldValue: null })).toBe("คะแนน 9.5");
    expect(describeSubject(base)).toBeNull();
  });

  it("describes schedule generation and role changes from JSON", () => {
    const sched = { ...base, action: "QUEUE_SCHEDULE_GENERATED", entityType: "Queue", newValue: '{"date":"2026-09-24","created":75,"updated":5,"total":80}' };
    expect(describeChange(sched)).toContain("สร้างใหม่ 75");
    const role = { ...base, action: "USER_ROLE_CHANGED", entityType: "User", oldValue: '{"role":"COMMITTEE"}', newValue: '{"role":"TEAM_LEADER"}' };
    expect(describeChange(role)).toBe("บทบาท กรรมการ → หัวหน้าทีม");
  });
});
