"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { SchoolRef } from "@/lib/types";

import { useT } from "@/lib/i18n";
interface AdminQueueItem {
  id: string;
  problemNumber: number;
  status: string;
  position: number;
  scheduledAt: string | null;
  schoolId: string;
  schoolName: string;
  schoolCode: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

export default function AdminQueuePage() {
  const t = useT();
  const [items, setItems] = useState<AdminQueueItem[]>([]);
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterProblem, setFilterProblem] = useState<number | "all">("all");
  const [schoolId, setSchoolId] = useState("");
  const [problemNumber, setProblemNumber] = useState(1);
  const [scheduleDate, setScheduleDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
  );
  const [startTime, setStartTime] = useState("13:30");
  const [slotMinutes, setSlotMinutes] = useState(15);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [itemsRes, schoolsRes] = await Promise.all([
        api.get<AdminQueueItem[]>("/admin/queue"),
        api.get<SchoolRef[]>("/admin/schools"),
      ]);
      setItems(itemsRes.data);
      setSchools(schoolsRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_load_data")));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!schoolId) return;
    setError(null);
    try {
      await api.post("/admin/queue", { schoolId, problemNumber });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_add_the_item")));
    }
  }

  async function handleGenerate() {
    const hasItems = items.length > 0;
    const message = hasItems
      ? t("generate_the_rotating_queue_schedule_for_dat", { date: scheduleDate, start: startTime, min: slotMinutes, count: items.length })
      : t("generate_the_rotating_queue_schedule_for_dat_2", { date: scheduleDate, start: startTime, min: slotMinutes });
    if (!window.confirm(message)) return;
    setError(null);
    setNotice(null);
    setGenerating(true);
    try {
      const { data } = await api.post<{ created: number; updated: number; total: number }>(
        "/admin/queue/generate",
        { date: scheduleDate, startTime, slotMinutes },
      );
      setNotice(
        t("schedule_generated_created_added_updated_re", { created: data.created, updated: data.updated, total: data.total }),
      );
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_generate_the_schedule")));
    } finally {
      setGenerating(false);
    }
  }

  function startEdit(item: AdminQueueItem) {
    setEditingId(item.id);
    if (item.scheduledAt) {
      const d = new Date(item.scheduledAt);
      const day = d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      setEditValue(`${day}T${formatTime(item.scheduledAt)}`);
    } else {
      setEditValue(`${scheduleDate}T${startTime}`);
    }
  }

  async function handleSaveTime(id: string) {
    const [date, time] = editValue.split("T");
    setError(null);
    try {
      await api.patch(`/admin/queue/${id}/time`, { date, time });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_change_the_time")));
    }
  }

  async function handleMove(id: string, direction: "up" | "down") {
    try {
      await api.patch("/admin/queue", { id, direction });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_reorder")));
    }
  }

  async function handleForceRelease(id: string) {
    try {
      await api.post(`/queue/${id}/release`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_release")));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("delete_this_queue_item"))) return;
    try {
      await api.delete("/admin/queue", { params: { id } });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_delete")));
    }
  }

  const filtered = items
    .filter((i) => filterProblem === "all" || i.problemNumber === filterProblem)
    .sort((a, b) => a.problemNumber - b.problemNumber || a.position - b.position);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink-900">{t("manage_queue")}</h2>
      {error && <p className="text-sm text-state-active-fg">{error}</p>}

      <div className="card-soft space-y-3 p-4">
        <div>
          <h3 className="font-semibold text-ink-900">{t("generate_rotating_queue_schedule")}</h3>
          <p className="text-sm text-ink-500">
            {t("creates_the_full_queue_for_every_centre_5_pr")}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="schedule-date" className="mb-1 block text-sm text-ink-500">
              {t("schedule_date")}
            </label>
            <input
              id="schedule-date"
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
            />
          </div>
          <div>
            <label htmlFor="schedule-start" className="mb-1 block text-sm text-ink-500">
              {t("start_time")}
            </label>
            <input
              id="schedule-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
            />
          </div>
          <div>
            <label htmlFor="schedule-slot" className="mb-1 block text-sm text-ink-500">
              {t("minutes_per_slot")}
            </label>
            <input
              id="schedule-slot"
              type="number"
              min={1}
              max={240}
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value))}
              className="touch-target w-24 rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || !scheduleDate || !startTime || !(slotMinutes >= 1)}
          >
            {generating ? t("generating") : t("generate_schedule")}
          </Button>
        </div>
        {notice && <p className="rounded-lg bg-state-done-bg px-3 py-2 text-sm text-state-done-fg">{notice}</p>}
      </div>

      <div className="card-soft flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-sm text-ink-500">{t("schools")}</label>
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
          >
            <option value="">{t("choose_a_school")}</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-500">{t("problem")}</label>
          <select
            value={problemNumber}
            onChange={(e) => setProblemNumber(Number(e.target.value))}
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleAdd} disabled={!schoolId}>
          {t("add_item")}
        </Button>

        <div className="ml-auto">
          <label className="mb-1 block text-sm text-ink-500">{t("filter_by_problem")}</label>
          <select
            value={filterProblem}
            onChange={(e) =>
              setFilterProblem(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="touch-target rounded-lg border border-line bg-surface px-3 py-2 text-ink-900"
          >
            <option value="all">{t("all")}</option>
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                {t("problem_n", { n: p })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-soft overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500">
              <th className="px-3 py-2">{t("centre_2")}</th>
              <th className="px-3 py-2">{t("problem")}</th>
              <th className="px-3 py-2">{t("no")}</th>
              <th className="px-3 py-2">{t("time")}</th>
              <th className="px-3 py-2">{t("status")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2 text-ink-900">{item.schoolName}</td>
                <td className="px-3 py-2 text-ink-700">{item.problemNumber}</td>
                <td className="px-3 py-2 text-ink-700">{item.position}</td>
                <td className="px-3 py-2 text-ink-700 tabular-nums">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="datetime-local"
                        aria-label={t("exam_time")}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-ink-900"
                      />
                      <Button onClick={() => handleSaveTime(item.id)} disabled={!editValue}>
                        {t("save")}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>
                        {t("cancel")}
                      </Button>
                    </div>
                  ) : (
                    formatTime(item.scheduledAt)
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" onClick={() => handleMove(item.id, "up")}>
                      ↑
                    </Button>
                    <Button variant="ghost" onClick={() => handleMove(item.id, "down")}>
                      ↓
                    </Button>
                    {item.status === "WAITING" && editingId !== item.id && (
                      <Button variant="secondary" onClick={() => startEdit(item)}>
                        {t("edit_time")}
                      </Button>
                    )}
                    {item.status === "IN_PROGRESS" && (
                      <Button variant="secondary" onClick={() => handleForceRelease(item.id)}>
                        {t("release")}
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => handleDelete(item.id)}>
                      {t("delete")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
