"use client";

import { ListOrdered } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
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
  claimedByUserId: string | null;
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
  const router = useRouter();
  const [items, setItems] = useState<AdminQueueItem[]>([]);
  const [schools, setSchools] = useState<SchoolRef[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [filterProblem, setFilterProblem] = useState<number | "all">("all");
  const [schoolId, setSchoolId] = useState("");
  const [problemNumber, setProblemNumber] = useState(1);
  const [scheduleDate, setScheduleDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
  );
  const [startTime, setStartTime] = useState("13:30");
  const [slotMinutes, setSlotMinutes] = useState(15);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSchoolId, setEditSchoolId] = useState("");
  const [editProblemNumber, setEditProblemNumber] = useState(1);
  const [editValue, setEditValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    danger?: boolean;
    requireText?: string;
    errorFallback?: string;
    run: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

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
  useEffect(() => {
    api
      .get<{ id: string }>("/auth/me")
      .then(({ data }) => setSelfId(data.id))
      .catch(() => setSelfId(null));
  }, []);

  // Admin claims a WAITING item directly from this table (school/problem/time
  // all visible right here) then jumps to /staff, the actual grading
  // workspace (ScoreForm) — see staff/page.tsx's doc comment.
  async function handleClaim(id: string) {
    setError(null);
    setClaimingId(id);
    try {
      await api.post(`/queue/${id}/claim`);
      router.push("/staff");
    } catch (err) {
      setError(getApiErrorMessage(err, t("failed_to_claim")));
      await load();
    } finally {
      setClaimingId(null);
    }
  }

  // Validate -> confirm -> save -> success message, per the queue-management
  // flow diagram ("ตรวจสอบความถูกต้องของข้อมูล" -> "ยืนยันการบันทึกข้อมูล").
  function handleAddClick() {
    setError(null);
    setNotice(null);
    if (!schoolId) {
      setError(t("please_choose_a_school_first"));
      return;
    }
    const school = schools.find((s) => s.id === schoolId);
    setConfirmAction({
      title: t("confirm_add_queue_item"),
      message: t("confirm_add_item_school_problem", { school: school?.name ?? "", n: problemNumber }),
      run: async () => {
        await api.post("/admin/queue", { schoolId, problemNumber });
        await load();
        setNotice(t("added_queue_item_successfully"));
      },
    });
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

  // Full edit (school + problem + time together), per the queue-management
  // flow diagram: fetch the item, pre-fill a form with its current data,
  // let the admin change anything, then validate -> confirm -> save.
  function startEdit(item: AdminQueueItem) {
    setEditingId(item.id);
    setEditSchoolId(item.schoolId);
    setEditProblemNumber(item.problemNumber);
    if (item.scheduledAt) {
      const d = new Date(item.scheduledAt);
      const day = d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      setEditValue(`${day}T${formatTime(item.scheduledAt)}`);
    } else {
      setEditValue(`${scheduleDate}T${startTime}`);
    }
  }

  function handleSaveEditClick(item: AdminQueueItem) {
    setError(null);
    setNotice(null);
    const [date, time] = editValue.split("T");
    if (!editSchoolId || !date || !time) {
      setError(t("please_choose_a_valid_date_and_time"));
      return;
    }
    const school = schools.find((s) => s.id === editSchoolId);
    setConfirmAction({
      title: t("confirm_edit_queue_item"),
      message: t("confirm_edit_queue_item_message", {
        school: school?.name ?? "",
        n: editProblemNumber,
        value: editValue.replace("T", " "),
      }),
      run: async () => {
        await api.patch(`/admin/queue/${item.id}`, {
          schoolId: editSchoolId,
          problemNumber: editProblemNumber,
          date,
          time,
        });
        setEditingId(null);
        await load();
        setNotice(t("edited_queue_item_successfully"));
      },
    });
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

  function handleDeleteClick(item: AdminQueueItem) {
    setError(null);
    setNotice(null);
    setConfirmAction({
      title: t("delete_this_queue_item"),
      message: t("confirm_delete_item_school_problem", { school: item.schoolName, n: item.problemNumber }),
      danger: true,
      run: async () => {
        await api.delete("/admin/queue", { params: { id: item.id } });
        await load();
        setNotice(t("deleted_queue_item_successfully"));
      },
    });
  }

  // Admin-UI equivalent of `npm run reset:test -- --yes` — deletes every
  // score/edit-request/related audit row and rewinds the queue to WAITING.
  // Gated by a typed "RESET" confirmation (beyond the usual click) since
  // it's irreversible; backend also refuses when NODE_ENV=production.
  function handleResetClick() {
    setError(null);
    setNotice(null);
    setConfirmAction({
      title: t("confirm_reset_queue_title"),
      message: t("confirm_reset_queue_message"),
      danger: true,
      requireText: "RESET",
      errorFallback: t("failed_to_reset_the_queue"),
      run: async () => {
        const { data } = await api.post<{
          scoresDeleted: number;
          editRequestsDeleted: number;
          queueItemsRewound: number;
        }>("/admin/queue/reset");
        await load();
        setNotice(
          t("reset_queue_successfully", {
            scores: data.scoresDeleted,
            edits: data.editRequestsDeleted,
            items: data.queueItemsRewound,
          }),
        );
      },
    });
  }

  async function handleConfirmYes() {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      await confirmAction.run();
      setConfirmAction(null);
    } catch (err) {
      setError(getApiErrorMessage(err, confirmAction.errorFallback ?? t("action_failed")));
      setConfirmAction(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  const filtered = items
    .filter((i) => filterProblem === "all" || i.problemNumber === filterProblem)
    .sort((a, b) => a.problemNumber - b.problemNumber || a.position - b.position);

  return (
    <div className="space-y-6">
      <PageHeader icon={ListOrdered} title={t("manage_queue")} />
      {error && <p className="text-sm text-state-active-fg">{error}</p>}
      {notice && (
        <p className="rounded-lg bg-state-done-bg px-3 py-2 text-sm text-state-done-fg">{notice}</p>
      )}

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
        <Button onClick={handleAddClick} disabled={!schoolId}>
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
              <th className="sticky right-0 bg-surface px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2 text-ink-900">
                  {editingId === item.id ? (
                    <select
                      aria-label={t("schools")}
                      value={editSchoolId}
                      onChange={(e) => setEditSchoolId(e.target.value)}
                      className="w-full max-w-[180px] truncate rounded-lg border border-line bg-surface px-2 py-1 text-ink-900"
                    >
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    item.schoolName
                  )}
                </td>
                <td className="px-3 py-2 text-ink-700">
                  {editingId === item.id ? (
                    <select
                      aria-label={t("problem")}
                      value={editProblemNumber}
                      onChange={(e) => setEditProblemNumber(Number(e.target.value))}
                      className="rounded-lg border border-line bg-surface px-2 py-1 text-ink-900"
                    >
                      {[1, 2, 3, 4, 5].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    item.problemNumber
                  )}
                </td>
                <td className="px-3 py-2 text-ink-700">{item.position}</td>
                <td className="px-3 py-2 text-ink-700 tabular-nums">
                  {editingId === item.id ? (
                    <input
                      type="datetime-local"
                      aria-label={t("exam_time")}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="rounded-lg border border-line bg-surface px-2 py-1 text-ink-900"
                    />
                  ) : (
                    formatTime(item.scheduledAt)
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={item.status} />
                </td>
                <td className="sticky right-0 bg-surface px-3 py-2">
                  {editingId === item.id ? (
                    <div className="flex justify-end gap-1.5">
                      <Button onClick={() => handleSaveEditClick(item)} disabled={!editSchoolId || !editValue}>
                        {t("save")}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>
                        {t("cancel")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" onClick={() => handleMove(item.id, "up")}>
                        ↑
                      </Button>
                      <Button variant="ghost" onClick={() => handleMove(item.id, "down")}>
                        ↓
                      </Button>
                      {item.status === "WAITING" && (
                        <>
                          <Button
                            disabled={claimingId !== null}
                            onClick={() => handleClaim(item.id)}
                          >
                            {claimingId === item.id ? t("claiming") : t("claim_and_grade")}
                          </Button>
                          <Button variant="secondary" onClick={() => startEdit(item)}>
                            {t("edit")}
                          </Button>
                        </>
                      )}
                      {item.status === "IN_PROGRESS" && (
                        <>
                          {item.claimedByUserId === selfId && (
                            <Button onClick={() => router.push("/staff")}>{t("go_grade")}</Button>
                          )}
                          <Button variant="secondary" onClick={() => handleForceRelease(item.id)}>
                            {t("release")}
                          </Button>
                        </>
                      )}
                      <Button variant="danger" onClick={() => handleDeleteClick(item)}>
                        {t("delete")}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-soft space-y-3 border border-saed-200 p-4">
        <div>
          <h3 className="font-semibold text-saed-600">{t("danger_zone")}</h3>
          <p className="text-sm text-ink-500">{t("reset_queue_description")}</p>
        </div>
        <Button variant="danger" onClick={handleResetClick}>
          {t("reset_queue")}
        </Button>
      </div>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          danger={confirmAction.danger}
          requireText={confirmAction.requireText}
          busy={confirmBusy}
          onConfirm={handleConfirmYes}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
