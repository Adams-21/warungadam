import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { GENERIC_ERROR_MESSAGE, getErrorMessage } from "./error-handler";

describe("getErrorMessage", () => {
  it("melempar ulang error redirect Next.js", () => {
    const redirectError = Object.assign(new Error("redirect"), {
      digest: "NEXT_REDIRECT;replace;/dashboard;307;",
    });

    expect(() => getErrorMessage(redirectError)).toThrow(redirectError);
  });

  it("melempar ulang error not found Next.js", () => {
    const notFoundError = Object.assign(new Error("not found"), {
      digest: "NEXT_NOT_FOUND",
    });

    expect(() => getErrorMessage(notFoundError)).toThrow(notFoundError);
  });

  it("menerjemahkan error koneksi database", () => {
    const initializationError = new Prisma.PrismaClientInitializationError(
      "connect ECONNREFUSED",
      "test",
    );
    const knownError = new Prisma.PrismaClientKnownRequestError("failed", {
      code: "P1001",
      clientVersion: "test",
    });

    expect(getErrorMessage(initializationError)).toBe(
      "Tidak dapat terhubung ke server database. Pastikan PostgreSQL aktif.",
    );
    expect(getErrorMessage(knownError)).toBe(
      "Tidak dapat terhubung ke server database. Pastikan PostgreSQL aktif.",
    );
  });

  it("menerjemahkan kode error Prisma lainnya", () => {
    const cases: [string, string][] = [
      ["P2002", "Data sudah terdaftar (kode/nomor/nama duplikat)."],
      [
        "P2003",
        "Data tidak valid atau masih terhubung dengan transaksi lain.",
      ],
      ["P2025", "Data yang dicari tidak ditemukan atau sudah berubah."],
    ];

    for (const [code, expected] of cases) {
      const error = new Prisma.PrismaClientKnownRequestError("failed", {
        code,
        clientVersion: "test",
      });
      expect(getErrorMessage(error)).toBe(expected);
    }
  });

  it("meneruskan pesan error validasi bisnis", () => {
    expect(getErrorMessage(new Error("Stok batch tidak mencukupi."))).toBe(
      "Stok batch tidak mencukupi.",
    );
  });

  it("mengembalikan pesan generik untuk error sistem tak terduga", () => {
    expect(getErrorMessage(new TypeError("Cannot read properties"))).toBe(
      GENERIC_ERROR_MESSAGE,
    );
    expect(getErrorMessage(new Error(""))).toBe(GENERIC_ERROR_MESSAGE);
    expect(getErrorMessage("boom")).toBe(GENERIC_ERROR_MESSAGE);
    expect(getErrorMessage(null)).toBe(GENERIC_ERROR_MESSAGE);
  });
});
