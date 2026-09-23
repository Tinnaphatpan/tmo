"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

interface CommitteeListItem {
  id: string;
  username: string;
  displayName: string;
  problemNumbers: number[];
}

const PROBLEMS = [1, 2, 3, 4, 5];

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
            onClick={() =>
              onChange(active ? selected.filter((n) => n !== p) : [...selected, p])
            }
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

export default function AdminCommitteePage() {
  const [list, setList] = useState<CommitteeListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [problemNumbers, setProblemNumbers] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProblems, setEditProblems] = useState<number[]>([]);
  const [editPassword, setEditPassword] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<CommitteeListItem[]>("/admin/committee");
      setList(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "โหลดข้อมูลไม่สำเร็จ"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    setError(null);
    setCreating(true);
    try {
      await api.post("/admin/committee", { username, displayName, password, problemNumbers });
      setUsername("");
      setDisplayName("");
      setPassword("");
      setProblemNumbers([]);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "สร้างบัญชีไม่สำเร็จ"));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(item: CommitteeListItem) {
    setEditingId(item.id);
    setEditProblems(item.problemNumbers);
    setEditPassword("");
  }

  async function handleSaveEdit(id: string) {
    setError(null);
    try {
      await api.patch("/admin/committee", {
        id,
        problemNumbers: editProblems,
        password: editPassword || undefined,
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "บันทึกไม่สำเร็จ"));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ยืนยันการลบบัญชีนี้?")) return;
    setError(null);
    try {
      await api.delete("/admin/committee", { params: { id } });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "ลบไม่สำเร็จ"));
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink-900">จัดการกรรมการ</h2>

      <div className="card-soft space-y-3 p-4">
        <h3 className="font-semibold text-ink-900">สร้างบัญชีใหม่</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500"
          />
          <input
            placeholder="ชื่อที่แสดง"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500"
          />
          <input
            placeholder="รหัสผ่าน (≥8 ตัว)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-500">มอบหมายข้อ:</span>
          <ProblemPicker selected={problemNumbers} onChange={setProblemNumbers} />
        </div>
        <Button
          onClick={handleCreate}
          disabled={
            creating || !username || !displayName || password.length < 8 || problemNumbers.length === 0
          }
        >
          สร้างบัญชี
        </Button>
        {error && <p className="text-sm text-state-active-fg">{error}</p>}
      </div>

      <div className="card-soft divide-y divide-line p-2">
        {list.map((item) => (
          <div key={item.id} className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-900">{item.displayName}</p>
                <p className="text-sm text-ink-500">@{item.username}</p>
              </div>
              <div className="flex gap-2">
                {editingId === item.id ? (
                  <>
                    <Button variant="secondary" onClick={() => handleSaveEdit(item.id)}>
                      บันทึก
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      ยกเลิก
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => startEdit(item)}>
                      แก้ไข
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(item.id)}>
                      ลบ
                    </Button>
                  </>
                )}
              </div>
            </div>
            {editingId === item.id ? (
              <div className="mt-3 space-y-2">
                <ProblemPicker selected={editProblems} onChange={setEditProblems} />
                <input
                  placeholder="รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="touch-target w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500"
                />
              </div>
            ) : (
              <p className="mt-1 text-sm text-ink-500">
                ข้อที่รับผิดชอบ: {item.problemNumbers.join(", ") || "-"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
