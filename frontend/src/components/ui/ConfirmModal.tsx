"use client";

import { useState } from "react";
import { Button } from "./Button";
import { useT } from "@/lib/i18n";

interface ConfirmModalProps {
  title: string;
  message: string;
  /** Styles the confirm button as destructive (red) instead of primary (green). */
  danger?: boolean;
  /** True while the confirmed action is in flight — disables both buttons. */
  busy?: boolean;
  /**
   * When set, the confirm button stays disabled until the user types this
   * exact text (case-sensitive) into a field — extra friction for severe,
   * irreversible actions (e.g. "RESET") beyond the usual click-to-confirm.
   */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared in-app confirm dialog, replacing native window.confirm() so
 * add/edit/delete actions on management pages (e.g. admin queue CRUD, per
 * the "จัดการคิว" flow diagram) get a themed "ยืนยันการบันทึก/ลบข้อมูล" step
 * instead of the browser's own dialog. Visual pattern matches
 * ScoreEditRequestModal (overlay + card-soft panel).
 */
export function ConfirmModal({
  title,
  message,
  danger = false,
  busy = false,
  requireText,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const t = useT();
  const [typed, setTyped] = useState("");
  const locked = !!requireText && typed !== requireText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card-soft w-full max-w-sm p-6 animate-slide-up">
        <h2 className="mb-2 text-lg font-bold text-ink-900">{title}</h2>
        <p className="mb-5 whitespace-pre-line text-sm text-ink-700">{message}</p>

        {requireText && (
          <div className="mb-5">
            <label htmlFor="confirm-modal-typed-text" className="mb-1 block text-sm font-medium text-ink-700">
              {t("type_text_to_confirm", { text: requireText })}
            </label>
            <input
              id="confirm-modal-typed-text"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
              autoComplete="off"
              className="touch-target w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500 focus:ring-1 focus:ring-saed-500"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy} className="flex-1">
            {t("cancel")}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy || locked}
            className="flex-1"
          >
            {busy ? t("saving") : t("confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
