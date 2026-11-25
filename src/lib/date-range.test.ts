import { describe, expect, it } from "vitest";
import {
  buildDateBounds,
  resolveDateRangePreset,
  toDateInputValue,
} from "./date-range";

describe("resolveDateRangePreset", () => {
  const now = new Date(2026, 2, 15);

  it("mengembalikan rentang hari ini", () => {
    expect(resolveDateRangePreset("today", now)).toEqual({
      from: "2026-03-15",
      to: "2026-03-15",
    });
  });

  it("mengembalikan tujuh hari terakhir termasuk hari ini", () => {
    expect(resolveDateRangePreset("last7", now)).toEqual({
      from: "2026-03-09",
      to: "2026-03-15",
    });
  });

  it("mengembalikan awal bulan sampai hari ini", () => {
    expect(resolveDateRangePreset("thisMonth", now)).toEqual({
      from: "2026-03-01",
      to: "2026-03-15",
    });
  });
});

describe("buildDateBounds", () => {
  it("membuat batas awal dan akhir hari", () => {
    const bounds = buildDateBounds("2026-03-01", "2026-03-03");

    expect(bounds?.gte).toEqual(new Date(2026, 2, 1));
    expect(bounds?.lte).toEqual(new Date(2026, 2, 3, 23, 59, 59, 999));
  });

  it("menukar rentang terbalik", () => {
    const bounds = buildDateBounds("2026-03-03", "2026-03-01");

    expect(bounds?.gte).toEqual(new Date(2026, 2, 1));
    expect(bounds?.lte).toEqual(new Date(2026, 2, 3, 23, 59, 59, 999));
  });

  it("mendukung batas hanya dari atau hanya sampai", () => {
    expect(buildDateBounds("2026-03-01", "")?.gte).toEqual(new Date(2026, 2, 1));
    expect(buildDateBounds("", "2026-03-03")?.lte).toEqual(
      new Date(2026, 2, 3, 23, 59, 59, 999),
    );
  });

  it("mengembalikan null untuk tanggal kosong atau tidak valid", () => {
    expect(buildDateBounds("", "")).toBeNull();
    expect(buildDateBounds("2026-13-01", "2026-03-03")).toBeNull();
    expect(buildDateBounds("2026-02-30", "2026-03-03")).toBeNull();
  });
});

describe("toDateInputValue", () => {
  it("memformat tanggal menjadi YYYY-MM-DD", () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
