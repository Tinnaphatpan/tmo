"use client";

import { UserCog } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import type { SchoolRef } from "@/lib/types";

import { useT } from "@/lib/i18n";
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

interface Scope {
  assignments: Assignment[];
  schoolId: string;
}
const EMPTY_SCOPE: Scope = { assignments: [], schoolId: "" };

type T = ReturnType<typeof useT>;

const ROLE_LABELS: Record<Role, string> = {
  COMMITTEE: "committee",
  STAFF: "staff",
  TEAM_LEADER: "team_leader",
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

function ProblemSchoolMatrix({
  value,
  schools,
  onChange,
}: {
  value: Assignment[];
  schools: SchoolRef[];
  onChange: (next: Assignment[]) => void;
}) {
  const t = useT();
  const update = (i: number, patch: Partial<Assignment>) =>
    onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  return (
    <div className="space-y-2">
      {value.map((a, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            aria-label={t("problem")}
            value={a.problemNumber}
            onChange={(e) => update(i, { problemNumber: Number(e.target.value) })}
            className={inputCls}
          >
            {PROBLEMS.map((p) => (
              <option key={p} value={p}>
                {t("problem_n", { n: p })}
              </option>
            ))}
          </select>
          <select
            aria-label={t("centre")}
            value={a.schoolId ?? ""}
            onChange={(e) => update(i, { schoolId: e.target.value || null })}
            className={inputCls}
          >
            <option value="">{t("all_centres")}</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button variant="ghost" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
            {t("delete")}
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() => onChange([...value, { problemNumber: 1, schoolId: null }])}
      >
        {t("add_problem_centre")}
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
  const t = useT();
  return (
    <select
      aria-label={t("centre_2")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      <option value="">{t("choose_a_centre")}</option>
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

function describeScope(row: MatrixRow, schools: SchoolRef[], t: T): string {
  if (row.role === "TEAM_LEADER") {
    return t("centre_name", { name: schools.find((s) => s.id === row.schoolId)?.name ?? "-" });
  }
  if (row.assignments.length === 0) return t("not_assigned_yet");
  return row.assignments
    .map((a) => {
      const school = a.schoolId ? schools.find((s) => s.id === a.schoolId)?.name : null;
      return `${t("problem_n", { n: a.problemNumber })}${school ? ` (${school})` : ""}`;
    })
    .join(", ");
}

export default function AdminPermissionsPage() {
  const t = useT();
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
      setError(getApiErrorMessage(err, t("failed_to_load_data")));
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
      setError(getApiErrorMessage(err, t("failed_to_create_the_account")));
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
      setError(getApiErrorMessage(err, t("failed_to_save")));
    }
  }

  async function handleDelete(row: MatrixRow) {
    if (!window.confirm(t("delete_this_account"))) return;
    setError(null);
    try {
      await api.delete(endpoint(row.role), { params: { id: row.id } });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_delete")));
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
      setError(getApiErrorMessage(err, t("failed_to_change_the_role")));
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
      setError(getApiErrorMessage(err, t("failed_to_upload_the_signature")));
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
      <PageHeader icon={UserCog} title={t("users_permissions")} />

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
            {t(ROLE_LABELS[r])}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <div className="card-soft space-y-3 p-4">
        <h3 className="font-semibold text-ink-900">{t("create_a_new_role_account", { role: t(ROLE_LABELS[tab]) })}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder={t("display_name")}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder={t("password_8_characters")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <span className="text-sm text-ink-500">
            {tab === "TEAM_LEADER" ? t("centre_in_charge") : t("assigned")}
          </span>
          <ScopeEditor role={tab} value={newScope} schools={schools} onChange={setNewScope} />
        </div>
        <Button onClick={handleCreate} disabled={!canSubmit}>
          {t("create_account")}
        </Button>
      </div>

      <div className="card-soft divide-y divide-line p-2">
        {visible.length === 0 && <p className="p-3 text-sm text-ink-500">{t("nothing_here")}</p>}
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
                      ? t("uploading")
                      : row.hasSignature
                        ? t("signature_replace")
                        : t("upload_signature")}
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
                      {t("save")}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      {t("cancel")}
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
                      {t("edit")}
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
                      {t("change_role")}
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(row)}>
                      {t("delete")}
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
                  placeholder={t("new_password_leave_blank_to_keep")}
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
                  <span className="text-sm text-ink-700">{t("change_to")}</span>
                  <select
                    aria-label={t("new_role")}
                    value={roleChange.role}
                    onChange={(e) =>
                      setRoleChange({ ...roleChange, role: e.target.value as Role, scope: EMPTY_SCOPE })
                    }
                    className={inputCls}
                  >
                    {ROLES.filter((r) => r !== row.role).map((r) => (
                      <option key={r} value={r}>
                        {t(ROLE_LABELS[r])}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-ink-500">
                    {roleChange.role === "TEAM_LEADER" ? t("centre_in_charge") : t("assigned")}
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
                    {t("confirm_role_change")}
                  </Button>
                  <Button variant="ghost" onClick={() => setRoleChange(null)}>
                    {t("cancel")}
                  </Button>
                </div>
                <p className="text-xs text-ink-500">
                  {t("the_user_must_not_be_holding_a_queue_item_ta")}
                </p>
              </div>
            )}

            {editingId !== row.id && (
              <p className="mt-1 text-sm text-ink-500">{describeScope(row, schools, t)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
