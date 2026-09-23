"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import type { SchoolRef } from "@/lib/types";

type Role = "COMMITTEE" | "STAFF" | "TEAM_LEADER";

interface Assignment {
  problemNumber: number;
  schoolId: string | null;
}

/** Mirrors GetPermissionMatrixUseCase's row (backend B6). */
interface MatrixRow {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  schoolId: string | null;
  hasSignature: boolean;
  assignments: Assignment[];
}

/** Scope being edited: COMMITTEE/STAFF use `assignments`, TEAM_LEADER uses `schoolId`. */
interface Scope {
  assignments: Assignment[];
  schoolId: string;
}
const EMPTY_SCOPE: Scope = { assignments: [], schoolId: "" };

const ROLE_LABELS: Record<Role, string> = {
  COMMITTEE: "กรรมการ",
  STAFF: "เจ้าหน้าที่",
  TEAM_LEADER: "หัวหน้าทีม",
};
const ROLES = Object.keys(ROLE_LABELS) as Role[];
const PROBLEMS = [1, 2, 3, 4, 5];

const inputCls =
  "touch-target max-w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500";

function ProblemPicker({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {PROBLEMS.map((p) => {
        const active = selected.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(active ? selected.filter((n) => n !== p) : [...selected, p])}
            className={`touch-target h-9 w-9 rounded-lg border text-sm font-medium ${
              active
                ? "border-saed-500 bg-saed-100 text-saed-700"
                : "border-line bg-surface text-ink-500"
            }`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

/** STAFF scope: any number of (problem, school-or-all) rows. */
function ProblemSchoolMatrix({
  value,
  schools,
  onChange,
}: {
  value: Assignment[];
  schools: SchoolRef[];
  onChange: (next: Assignment[]) => void;
}) {
  const update = (i: number, patch: Partial<Assignment>) =>
    onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  return (
    <div className="space-y-2">
      {value.map((a, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            aria-label="ข้อ"
            value={a.problemNumber}
            onChange={(e) => update(i, { problemNumber: Number(e.target.value) })}
            className={inputCls}
          >
            {PROBLEMS.map((p) => (
              <option key={p} value={p}>
                ข้อ {p}
              </option>
            ))}
          </select>
          <select
            aria-label="ศูนย์"
            value={a.schoolId ?? ""}
            onChange={(e) => update(i, { schoolId: e.target.value || null })}
            className={inputCls}
          >
            <option value="">ทุกศูนย์</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button variant="ghost" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
            ลบ
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() => onChange([...value, { problemNumber: 1, schoolId: null }])}
      >
        + เพิ่มข้อ/ศูนย์
      </Button>
    </div>
  );
}

function SchoolSelect({
  value,
  schools,
  onChange,
}: {
  value: string;
  schools: SchoolRef[];
  onChange: (next: string) => void;
}) {
  return (
    <select
      aria-label="ศูนย์สอบ"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      <option value="">เลือกศูนย์สอบ...</option>
      {schools.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

function ScopeEditor({
  role,
  value,
  schools,
  onChange,
}: {
  role: Role;
  value: Scope;
  schools: SchoolRef[];
  onChange: (next: Scope) => void;
}) {
  if (role === "TEAM_LEADER") {
    return (
      <SchoolSelect
        value={value.schoolId}
        schools={schools}
        onChange={(schoolId) => onChange({ ...value, schoolId })}
      />
    );
  }
  if (role === "COMMITTEE") {
    return (
      <ProblemPicker
        selected={value.assignments.map((a) => a.problemNumber)}
        onChange={(nums) =>
          onChange({
            ...value,
            assignments: nums.map((problemNumber) => ({ problemNumber, schoolId: null })),
          })
        }
      />
    );
  }
  return (
    <ProblemSchoolMatrix
      value={value.assignments}
      schools={schools}
      onChange={(assignments) => onChange({ ...value, assignments })}
    />
  );
}

/** Body fragment carrying the scope in the shape each endpoint expects. */
function scopeBody(role: Role, scope: Scope) {
  if (role === "TEAM_LEADER") return { schoolId: scope.schoolId };
  if (role === "STAFF") return { assignments: scope.assignments };
  return { problemNumbers: scope.assignments.map((a) => a.problemNumber) };
}

const scopeIsEmpty = (role: Role, scope: Scope) =>
  role === "TEAM_LEADER" ? scope.schoolId === "" : scope.assignments.length === 0;

const endpoint = (role: Role) =>
  role === "STAFF" ? "/admin/staff" : role === "TEAM_LEADER" ? "/admin/team-leaders" : "/admin/committee";

function scopeOf(row: MatrixRow): Scope {
  return { assignments: row.assignments, schoolId: row.schoolId ?? "" };
}

function describeScope(row: MatrixRow, schools: SchoolRef[]): string {
  if (row.role === "TEAM_LEADER") {
    return `ศูนย์: ${schools.find((s) => s.id === row.schoolId)?.name ?? "-"}`;
  }
  if (row.assignments.length === 0) return "ยังไม่ได้มอบหมาย";
  return row.assignments
    .map((a) => {
      const school = a.schoolId ? schools.find((s) => s.id === a.schoolId)?.name : null;
      return `ข้อ ${a.problemNumber}${school ? ` (${school})` : ""}`;
    })
    .join(", ");
}

export default function AdminPermissionsPage() {
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [tab, setTab] = useState<Role>("COMMITTEE");
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [newScope, setNewScope] = useState<Scope>(EMPTY_SCOPE);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<Scope>(EMPTY_SCOPE);
  const [editPassword, setEditPassword] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Role change panel (one user at a time).
  const [roleChange, setRoleChange] = useState<{ id: string; role: Role; scope: Scope } | null>(null);

  const load = useCallback(async () => {
    try {
      const [matrix, schoolList] = await Promise.all([
        api.get<MatrixRow[]>("/admin/permissions"),
        api.get<SchoolRef[]>("/admin/schools"),
      ]);
      setRows(matrix.data);
      setSchools(schoolList.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function switchTab(next: Role) {
    setTab(next);
    setNewScope(EMPTY_SCOPE);
    setEditingId(null);
    setRoleChange(null);
    setError(null);
  }

  async function handleCreate() {
    setError(null);
    setCreating(true);
    try {
      await api.post(endpoint(tab), {
        username,
        displayName,
        password,
        ...scopeBody(tab, newScope),
      });
      setUsername("");
      setDisplayName("");
      setPassword("");
      setNewScope(EMPTY_SCOPE);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "สร้างบัญชีไม่สำเร็จ"));
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(row: MatrixRow) {
    setError(null);
    try {
      await api.patch(endpoint(row.role), {
        id: row.id,
        ...scopeBody(row.role, editScope),
        password: editPassword || undefined,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "บันทึกไม่สำเร็จ"));
    }
  }

  async function handleDelete(row: MatrixRow) {
    if (!window.confirm("ยืนยันการลบบัญชีนี้?")) return;
    setError(null);
    try {
      await api.delete(endpoint(row.role), { params: { id: row.id } });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "ลบไม่สำเร็จ"));
    }
  }

  async function handleChangeRole() {
    if (!roleChange) return;
    setError(null);
    const { id, role, scope } = roleChange;
    try {
      await api.patch(`/admin/users/${id}/role`, {
        role,
        ...(role === "TEAM_LEADER"
          ? { schoolId: scope.schoolId }
          : { assignments: scope.assignments }),
      });
      setRoleChange(null);
      setTab(role); // follow the user to their new role's tab
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "เปลี่ยนบทบาทไม่สำเร็จ"));
    }
  }

  async function handleSignature(row: MatrixRow, file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploadingId(row.id);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post(`/admin/users/${row.id}/signature`, form);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "อัปโหลดลายเซ็นไม่สำเร็จ"));
    } finally {
      setUploadingId(null);
    }
  }

  const visible = rows.filter((r) => r.role === tab);
  const canSubmit =
    !creating &&
    username &&
    displayName &&
    password.length >= 8 &&
    !scopeIsEmpty(tab, newScope);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink-900">ผู้ใช้และสิทธิ์</h2>

      <div className="flex gap-1">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => switchTab(r)}
            className={`touch-target rounded-lg px-4 py-1.5 text-sm font-medium ${
              tab === r ? "bg-saed-100 text-saed-700" : "text-ink-500 hover:bg-surface-sunken"
            }`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <div className="card-soft space-y-3 p-4">
        <h3 className="font-semibold text-ink-900">สร้างบัญชี{ROLE_LABELS[tab]}ใหม่</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder="ชื่อที่แสดง"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder="รหัสผ่าน (≥8 ตัว)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <span className="text-sm text-ink-500">
            {tab === "TEAM_LEADER" ? "ศูนย์ที่ดูแล:" : "มอบหมาย:"}
          </span>
          <ScopeEditor role={tab} value={newScope} schools={schools} onChange={setNewScope} />
        </div>
        <Button onClick={handleCreate} disabled={!canSubmit}>
          สร้างบัญชี
        </Button>
      </div>

      <div className="card-soft divide-y divide-line p-2">
        {visible.length === 0 && <p className="p-3 text-sm text-ink-500">ไม่มีรายการ</p>}
        {visible.map((row) => (
          <div key={row.id} className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-ink-900">{row.displayName}</p>
                <p className="text-sm text-ink-500">@{row.username}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer text-sm">
                  <span
                    className={`rounded-lg border px-3 py-1.5 ${
                      row.hasSignature
                        ? "border-state-done-border bg-state-done-bg text-state-done-fg"
                        : "border-state-queued-border bg-state-queued-bg text-state-queued-fg"
                    }`}
                  >
                    {uploadingId === row.id
                      ? "กำลังอัปโหลด..."
                      : row.hasSignature
                        ? "ลายเซ็น ✓ (เปลี่ยน)"
                        : "อัปโหลดลายเซ็น"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    disabled={uploadingId !== null}
                    onChange={(e) => {
                      handleSignature(row, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {editingId === row.id ? (
                  <>
                    <Button variant="secondary" onClick={() => handleSaveEdit(row)}>
                      บันทึก
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      ยกเลิก
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingId(row.id);
                        setRoleChange(null);
                        setEditScope(scopeOf(row));
                        setEditPassword("");
                      }}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setRoleChange({
                          id: row.id,
                          role: ROLES.find((r) => r !== row.role)!,
                          scope: EMPTY_SCOPE,
                        });
                      }}
                    >
                      เปลี่ยนบทบาท
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(row)}>
                      ลบ
                    </Button>
                  </>
                )}
              </div>
            </div>

            {editingId === row.id && (
              <div className="mt-3 space-y-2">
                <ScopeEditor
                  role={row.role}
                  value={editScope}
                  schools={schools}
                  onChange={setEditScope}
                />
                <input
                  placeholder="รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className={`${inputCls} w-full max-w-xs`}
                />
              </div>
            )}

            {roleChange?.id === row.id && (
              <div className="mt-3 space-y-3 rounded-lg border border-line bg-surface-sunken p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ink-700">เปลี่ยนเป็น:</span>
                  <select
                    aria-label="บทบาทใหม่"
                    value={roleChange.role}
                    onChange={(e) =>
                      setRoleChange({ ...roleChange, role: e.target.value as Role, scope: EMPTY_SCOPE })
                    }
                    className={inputCls}
                  >
                    {ROLES.filter((r) => r !== row.role).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-ink-500">
                    {roleChange.role === "TEAM_LEADER" ? "ศูนย์ที่ดูแล:" : "มอบหมาย:"}
                  </span>
                  <ScopeEditor
                    role={roleChange.role}
                    value={roleChange.scope}
                    schools={schools}
                    onChange={(scope) => setRoleChange({ ...roleChange, scope })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleChangeRole}
                    disabled={scopeIsEmpty(roleChange.role, roleChange.scope)}
                  >
                    ยืนยันเปลี่ยนบทบาท
                  </Button>
                  <Button variant="ghost" onClick={() => setRoleChange(null)}>
                    ยกเลิก
                  </Button>
                </div>
                <p className="text-xs text-ink-500">
                  ผู้ใช้ต้องไม่ถือคิวค้างอยู่ และมีผลทันที (หน้าเว็บจะพาไปยังหน้าตามบทบาทใหม่เมื่อเปิดหน้าถัดไป)
                </p>
              </div>
            )}

            {editingId !== row.id && (
              <p className="mt-1 text-sm text-ink-500">{describeScope(row, schools)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
