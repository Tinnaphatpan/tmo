import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import AdminSchoolsPage from "./page";

const apiError = (message: string) =>
  Object.assign(new Error("x"), { isAxiosError: true, response: { status: 409, data: { error: message } } });

const SCHOOL_A = { id: "sch-a", name: "School A", code: "A" };

function mockList(schools: unknown[]) {
  get.mockResolvedValue({ data: schools });
}

beforeEach(() => {
  for (const fn of [get, post, patch, del]) fn.mockReset();
});

describe("Admin schools page: add via confirm modal", () => {
  it("validates a name is entered, shows a confirm dialog, then posts and shows a success message", async () => {
    mockList([]);
    post.mockResolvedValue({ data: { school: {} } });
    render(<AdminSchoolsPage />);

    const addButton = await screen.findByRole("button", { name: "เพิ่ม" });
    expect(addButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("ชื่อโรงเรียน"), "School B");
    await userEvent.type(screen.getByPlaceholderText("รหัส (code)"), "B");
    await userEvent.click(addButton);

    expect(await screen.findByText("เพิ่มโรงเรียน School B (B) ใช่หรือไม่?")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(post).toHaveBeenCalledWith("/admin/schools", { name: "School B", code: "B" });
    expect(await screen.findByText("เพิ่มโรงเรียนสำเร็จ")).toBeInTheDocument();
  });

  it("does not post when the add confirmation is cancelled", async () => {
    mockList([]);
    render(<AdminSchoolsPage />);
    await userEvent.type(await screen.findByPlaceholderText("ชื่อโรงเรียน"), "School B");
    await userEvent.click(screen.getByRole("button", { name: "เพิ่ม" }));
    await userEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(post).not.toHaveBeenCalled();
  });
});

describe("Admin schools page: edit via confirm modal", () => {
  it("pre-fills the form, shows a confirm dialog, then patches and shows a success message", async () => {
    mockList([SCHOOL_A]);
    patch.mockResolvedValue({ data: { school: {} } });
    render(<AdminSchoolsPage />);

    const row = (await screen.findByText("School A")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "แก้ไข" }));

    const nameInput = screen.getByPlaceholderText("ชื่อโรงเรียน") as HTMLInputElement;
    expect(nameInput.value).toBe("School A");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "School A2");
    await userEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText("บันทึกการแก้ไขเป็น School A2 (A) ใช่หรือไม่?")).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(patch).toHaveBeenCalledWith("/admin/schools", { id: "sch-a", name: "School A2", code: "A" });
    expect(await screen.findByText("แก้ไขโรงเรียนสำเร็จ")).toBeInTheDocument();
  });

  it("does not patch when the edit confirmation is cancelled", async () => {
    mockList([SCHOOL_A]);
    render(<AdminSchoolsPage />);
    const row = (await screen.findByText("School A")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "แก้ไข" }));
    await userEvent.click(screen.getByRole("button", { name: "บันทึก" }));
    // Two "ยกเลิก" buttons exist now: the form's own cancel-edit button, and
    // the confirm modal's — the modal's is rendered last in the component tree.
    const cancelButtons = await screen.findAllByRole("button", { name: "ยกเลิก" });
    await userEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(patch).not.toHaveBeenCalled();
  });
});

describe("Admin schools page: delete via confirm modal", () => {
  it("shows a themed confirm dialog (not window.confirm) naming the school, then deletes on confirm", async () => {
    mockList([SCHOOL_A]);
    del.mockResolvedValue({});
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<AdminSchoolsPage />);

    const row = (await screen.findByText("School A")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "ลบ" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByText(/School A ใช่หรือไม่/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(del).toHaveBeenCalledWith("/admin/schools", { params: { id: "sch-a" } });
    expect(await screen.findByText("ลบโรงเรียนสำเร็จ")).toBeInTheDocument();
  });

  it("shows the backend's refusal (e.g. still has queue items) and no success notice", async () => {
    mockList([SCHOOL_A]);
    del.mockRejectedValue(apiError("ศูนย์นี้มีรายการคิวอยู่ ลบไม่ได้"));
    render(<AdminSchoolsPage />);

    const row = (await screen.findByText("School A")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "ลบ" }));
    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));

    expect(await screen.findByText("ศูนย์นี้มีรายการคิวอยู่ ลบไม่ได้")).toBeInTheDocument();
    expect(screen.queryByText("ลบโรงเรียนสำเร็จ")).toBeNull();
  });

  it("does not delete when the delete confirmation is cancelled", async () => {
    mockList([SCHOOL_A]);
    render(<AdminSchoolsPage />);
    const row = (await screen.findByText("School A")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "ลบ" }));
    await userEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(del).not.toHaveBeenCalled();
  });
});
