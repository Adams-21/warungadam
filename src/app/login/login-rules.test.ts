import { describe, expect, it } from "vitest";
import {
  DEFAULT_SESSION_TIMEOUT_MINUTES,
  getValidationMessage,
  isSessionExpired,
  resolveSessionTimeoutMinutes,
  toLoginFieldValue,
} from "./login-rules";

describe("Atur sesi login", () => {
  it("memakai durasi sesi yang dikonfigurasi", () => {
    expect(resolveSessionTimeoutMinutes(15)).toBe(15);
    expect(resolveSessionTimeoutMinutes(30.9)).toBe(30);
  });

  it("memakai durasi bawaan untuk konfigurasi kosong atau tidak valid", () => {
    expect(resolveSessionTimeoutMinutes(null)).toBe(DEFAULT_SESSION_TIMEOUT_MINUTES);
    expect(resolveSessionTimeoutMinutes(0)).toBe(DEFAULT_SESSION_TIMEOUT_MINUTES);
    expect(resolveSessionTimeoutMinutes(-5)).toBe(DEFAULT_SESSION_TIMEOUT_MINUTES);
    expect(resolveSessionTimeoutMinutes(Number.NaN)).toBe(
      DEFAULT_SESSION_TIMEOUT_MINUTES,
    );
  });

  it("mendeteksi sesi kedaluwarsa", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    expect(isSessionExpired("2026-03-01T11:59:59Z", now)).toBe(true);
    expect(isSessionExpired("2026-03-01T12:00:00Z", now)).toBe(true);
  });

  it("membiarkan sesi yang masih aktif", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    expect(isSessionExpired("2026-03-01T12:00:01Z", now)).toBe(false);
    expect(isSessionExpired("2026-03-02T12:00:00Z", now)).toBe(false);
  });

  it("menganggap tanggal sesi tidak valid sebagai kedaluwarsa", () => {
    expect(isSessionExpired("bukan-tanggal", new Date("2026-03-01"))).toBe(true);
  });
});

describe("Pesan error login", () => {
  it("mengambil pesan validasi pertama yang tersedia", () => {
    expect(
      getValidationMessage([{ message: "Username wajib diisi" }, { message: "x" }]),
    ).toBe("Username wajib diisi");
  });

  it("memakai pesan pengganti jika tidak ada pesan validasi", () => {
    expect(getValidationMessage([])).toBe("Username atau password tidak valid.");
    expect(getValidationMessage([{ message: "  " }])).toBe(
      "Username atau password tidak valid.",
    );
  });

  it("menormalkan nilai field FormData", () => {
    expect(toLoginFieldValue("admin")).toBe("admin");
    expect(toLoginFieldValue("")).toBe("");
    expect(toLoginFieldValue(null)).toBe("");
    expect(toLoginFieldValue(undefined)).toBe("");
    expect(toLoginFieldValue(new File(["x"], "x.txt"))).toBe("");
  });
});
