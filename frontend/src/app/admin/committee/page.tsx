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

const ROLE_LABELS: Record<Role, string> = {
  COMMITTEE: "กรรมการ",
  STAFF: "เจ้าหน้าที่",
  TEAM_LEADER: "หัวหน้าทีม",
};
const PROBLEMS = [1, 2, 3, 4, 5];

const inputCls =
  "touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500";

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

function ScopeEditor({
  role,
  value,
  schools,
  onChange,
}: {
  role: Role;
  value: Assignment[];
  schools: SchoolRef[];
  onChange: (next: Assignment[]) => void;
}) {
  if (role === "COMMITTEE") {
    return (
      <ProblemPicker
        selected={value.map((a) => a.problemNumber)}
        onChange={(nums) =>
          onChange(nums.map((problemNumber) => ({ problemNumber, schoolId: null })))
        }
      />
    );
  }
  return <ProblemSchoolMatrix value={value} schools={schools} onChange={onChange} />;
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
  const [newScope, setNewScope] = useState<Assignment[]>([]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<Assignment[]>([]);
  const [editPassword, setEditPassword] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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

  const endpoint = (role: Role) => (role === "STAFF" ? "/admin/staff" : "/admin/committee");
  const scopeBody = (role: Role, scope: Assignment[]) =>
    role === "STAFF"
      ? { assignments: scope }
      : { problemNumbers: scope.map((a) => a.problemNumber) };

  function switchTab(next: Role) {
    setTab(next);
    setNewScope([]);
    setEditingId(null);
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
      setNewScope([]);
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
  const canCreate = tab !== "TEAM_LEADER";
  const canSubmit =
    !creating && username && displayName && password.length >= 8 && newScope.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink-900">ผู้ใช้และสิทธิ์</h2>

      <div className="flex gap-1">
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
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

      {canCreate ? (
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
            <span className="text-sm text-ink-500">มอบหมาย:</span>
            <ScopeEditor role={tab} value={newScope} schools={schools} onChange={setNewScope} />
          </div>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            สร้างบัญชี
          </Button>
        </div>
      ) : (
        <p className="text-sm text-ink-500">
          บัญชีหัวหน้าทีมสร้างผ่านการนำเข้าข้อมูล — หน้านี้ใช้อัปโหลดลายเซ็นเท่านั้น
        </p>
      )}

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
                {row.role !== "TEAM_LEADER" &&
                  (editingId === row.id ? (
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
                          setEditScope(row.assignments);
                          setEditPassword("");
                        }}
                      >
                        แก้ไข
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(row)}>
                        ลบ
                      </Button>
                    </>
                  ))}
              </div>
            </div>
            {editingId === row.id ? (
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
            ) : (
              <p className="mt-1 text-sm text-ink-500">{describeScope(row, schools)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
