import { describe, expect, it } from "vitest";
import {
  isPresetSessionTimeout,
  latestBusinessSettingsId,
  parseSessionTimeoutMinutes,
  resolveBusinessSettingsId,
  sessionTimeoutLabel,
} from "./settings-helpers";

const OLD_ID = "11111111-1111-4111-8111-111111111111";
const NEW_ID = "22222222-2222-4222-8222-222222222222";

const RECORDS = [
  { id: OLD_ID, updated_at: new Date("2026-01-01T00:00:00.000Z") },
  { id: NEW_ID, updated_at: new Date("2026-02-01T00:00:00.000Z") },
];

describe("Identitas Pengaturan Bisnis", () => {
  it("memilih catatan terbaru saat ID tidak diisi atau tidak valid", () => {
    expect(resolveBusinessSettingsId("", RECORDS)).toBe(NEW_ID);
    expect(resolveBusinessSettingsId(null, RECORDS)).toBe(NEW_ID);
    expect(resolveBusinessSettingsId("bukan-uuid", RECORDS)).toBe(NEW_ID);
    expect(latestBusinessSettingsId(RECORDS)).toBe(NEW_ID);
  });

  it("memakai ID UUID yang sah bila cocok dengan catatan", () => {
    expect(resolveBusinessSettingsId(OLD_ID, RECORDS)).toBe(OLD_ID);
    expect(resolveBusinessSettingsId(`  ${NEW_ID}  `, RECORDS)).toBe(NEW_ID);
  });

  it("menolak ID yang tidak cocok dengan catatan mana pun", () => {
    const unknownId = "33333333-3333-4333-8333-333333333333";
    expect(resolveBusinessSettingsId(unknownId, RECORDS)).toBe(NEW_ID);
    expect(resolveBusinessSettingsId(unknownId, [])).toBeNull();
    expect(latestBusinessSettingsId([])).toBeNull();
  });
});

describe("Timeout Sesi Pengaturan", () => {
  it("mengenali nilai bawaan dan nilai khusus", () => {
    expect(isPresetSessionTimeout("15")).toBe(true);
    expect(isPresetSessionTimeout(120)).toBe(true);
    expect(isPresetSessionTimeout("45")).toBe(false);
    expect(isPresetSessionTimeout("abc")).toBe(false);
  });

  it("menampilkan label timeout yang terbaca manusia", () => {
    expect(sessionTimeoutLabel("15")).toBe("15 Menit");
    expect(sessionTimeoutLabel(60)).toBe("1 Jam");
    expect(sessionTimeoutLabel("120")).toBe("Maksimal 2 Jam");
    expect(sessionTimeoutLabel("45")).toBe("45 Menit");
  });

  it("memparsing nilai timeout yang valid", () => {
    expect(parseSessionTimeoutMinutes("45")).toBe(45);
    expect(parseSessionTimeoutMinutes(60)).toBe(60);
    expect(parseSessionTimeoutMinutes("")).toBeNull();
    expect(parseSessionTimeoutMinutes("", "30")).toBe(30);
  });

  it("menolak timeout di luar rentang atau bukan bilangan bulat", () => {
    expect(parseSessionTimeoutMinutes("0")).toBeNull();
    expect(parseSessionTimeoutMinutes("1441")).toBeNull();
    expect(parseSessionTimeoutMinutes("1.5")).toBeNull();
    expect(parseSessionTimeoutMinutes("abc")).toBeNull();
    expect(parseSessionTimeoutMinutes(null, "2000")).toBeNull();
  });
});
