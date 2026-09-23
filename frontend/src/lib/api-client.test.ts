import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { api, getApiErrorMessage } from "./api-client";

function axiosErrorWith(data: unknown): AxiosError {
  return new AxiosError("fail", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });
}

describe("api client", () => {
  it("always targets the same-origin BFF with credentials", () => {
    expect(api.defaults.baseURL).toBe("/api/bff");
    expect(api.defaults.withCredentials).toBe(true);
  });
});

describe("getApiErrorMessage (SPEC §2.5 { error } bodies)", () => {
  it("extracts the backend's error string", () => {
    expect(getApiErrorMessage(axiosErrorWith({ error: "คุณไม่ได้ถือคิวนี้อยู่" }))).toBe(
      "คุณไม่ได้ถือคิวนี้อยู่",
    );
  });

  it("falls back when the body has no error, or the error is not an axios error", () => {
    expect(getApiErrorMessage(axiosErrorWith({}), "custom")).toBe("custom");
    expect(getApiErrorMessage(axiosErrorWith(undefined))).toBe("เกิดข้อผิดพลาด");
    expect(getApiErrorMessage(new Error("x"), "custom")).toBe("custom");
    expect(getApiErrorMessage(null)).toBe("เกิดข้อผิดพลาด");
  });
});
