import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { post: (...a: unknown[]) => post(...a) },
}));

import { ScoreForm } from "./ScoreForm";
import type { MyQueueItem } from "@/lib/types";

function makeItem(overrides: Partial<MyQueueItem> = {}): MyQueueItem {
  return {
    id: "item-1",
    problemNumber: 1,
    status: "IN_PROGRESS",
    position: 0,
    scheduledAt: null,
    claimedByUserId: "u",
    approvalStatus: "NOT_SUBMITTED",
    scores: [],
    school: {
      id: "s1",
      name: "โรงเรียน A",
      code: "A",
      students: [
        { id: "st1", studentCode: "1A", seqNo: 1, name: "นักเรียน 1", schoolId: "s1" },
        { id: "st2", studentCode: "2A", seqNo: 2, name: "นักเรียน 2", schoolId: "s1" },
      ],
    },
    ...overrides,
  };
}

const inputs = () => screen.getAllByRole("spinbutton") as HTMLInputElement[];
const submitBtn = () => screen.getByRole("button", { name: "ส่งคะแนนเพื่อรออนุมัติ" });
const draftBtn = () => screen.getByRole("button", { name: /บันทึกร่าง/ });

beforeEach(() => post.mockReset());

describe("ScoreForm", () => {
  it("renders one input per student and keeps submit disabled until every value is valid (0-10)", async () => {
    render(<ScoreForm item={makeItem()} onSubmitted={vi.fn()} />);
    expect(inputs()).toHaveLength(2);
    expect(submitBtn()).toBeDisabled();

    await userEvent.type(inputs()[0], "7.5");
    expect(submitBtn()).toBeDisabled(); // second still empty

    await userEvent.type(inputs()[1], "11");
    expect(submitBtn()).toBeDisabled(); // out of range

    await userEvent.clear(inputs()[1]);
    await userEvent.type(inputs()[1], "0");
    expect(submitBtn()).toBeEnabled(); // 0 is a valid score
  });

  it("prefills from existing scores", () => {
    render(
      <ScoreForm
        item={makeItem({
          scores: [{ id: "x", studentId: "st1", queueItemId: "item-1", value: 6.5, judgeId: "j" }],
        })}
        onSubmitted={vi.fn()}
      />,
    );
    expect(inputs()[0].value).toBe("6.5");
    expect(inputs()[1].value).toBe("");
  });

  it("posts every student's score to /queue/:id/score and calls onSubmitted", async () => {
    post.mockResolvedValue({});
    const onSubmitted = vi.fn();
    render(<ScoreForm item={makeItem()} onSubmitted={onSubmitted} />);
    await userEvent.type(inputs()[0], "7.5");
    await userEvent.type(inputs()[1], "3");
    await userEvent.click(submitBtn());

    expect(post).toHaveBeenCalledWith("/queue/item-1/score", {
      scores: [
        { studentId: "st1", value: 7.5 },
        { studentId: "st2", value: 3 },
      ],
    });
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
  });

  it("shows the backend's { error } message and does not call onSubmitted on failure", async () => {
    const apiError = Object.assign(new Error("x"), {
      isAxiosError: true,
      response: { status: 409, data: { error: "ปิดรับคะแนนแล้ว" } },
    });
    post.mockRejectedValueOnce(apiError);
    const onSubmitted = vi.fn();
    render(<ScoreForm item={makeItem()} onSubmitted={onSubmitted} />);
    await userEvent.type(inputs()[0], "1");
    await userEvent.type(inputs()[1], "2");
    await userEvent.click(submitBtn());

    await waitFor(() => expect(document.body.textContent).toContain("ปิดรับคะแนนแล้ว"));
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(submitBtn()).toBeEnabled(); // can retry
  });

  describe("Save Draft (F6, sessionStorage only)", () => {
    it("saves under a per-item key, confirms, and un-confirms on the next edit", async () => {
      render(<ScoreForm item={makeItem()} onSubmitted={vi.fn()} />);
      await userEvent.type(inputs()[0], "4");
      await userEvent.click(draftBtn());

      expect(JSON.parse(sessionStorage.getItem("tmo-score-draft:item-1")!)).toEqual({ st1: "4", st2: "" });
      expect(draftBtn()).toHaveTextContent("บันทึกร่างแล้ว ✓");
      expect(post).not.toHaveBeenCalled(); // never hits the backend

      await userEvent.type(inputs()[1], "5");
      expect(draftBtn()).toHaveTextContent("บันทึกร่าง");
      expect(draftBtn()).not.toHaveTextContent("✓");
    });

    it("restores a saved draft on remount, overriding prefilled scores; other items are unaffected", () => {
      sessionStorage.setItem("tmo-score-draft:item-1", JSON.stringify({ st1: "9", st2: "8" }));
      const { unmount } = render(<ScoreForm item={makeItem()} onSubmitted={vi.fn()} />);
      expect(inputs().map((i) => i.value)).toEqual(["9", "8"]);
      unmount();

      render(<ScoreForm item={makeItem({ id: "item-2" })} onSubmitted={vi.fn()} />);
      expect(inputs().map((i) => i.value)).toEqual(["", ""]);
    });

    it("clears the draft after a successful submit but keeps it after a failed one", async () => {
      sessionStorage.setItem("tmo-score-draft:item-1", JSON.stringify({ st1: "1", st2: "2" }));

      post.mockRejectedValueOnce(new Error("net"));
      render(<ScoreForm item={makeItem()} onSubmitted={vi.fn()} />);
      await userEvent.click(submitBtn());
      await screen.findByText("บันทึกคะแนนไม่สำเร็จ");
      expect(sessionStorage.getItem("tmo-score-draft:item-1")).not.toBeNull();

      post.mockResolvedValueOnce({});
      await userEvent.click(submitBtn());
      await waitFor(() => expect(sessionStorage.getItem("tmo-score-draft:item-1")).toBeNull());
    });

    it("ignores a corrupt draft instead of crashing", () => {
      sessionStorage.setItem("tmo-score-draft:item-1", "{not json");
      render(<ScoreForm item={makeItem()} onSubmitted={vi.fn()} />);
      expect(inputs().map((i) => i.value)).toEqual(["", ""]);
    });
  });
});
