import { uuidSchema } from "@/lib/schemas";

export const SESSION_TIMEOUT_PRESETS = [15, 30, 60, 120] as const;

export type BusinessSettingsRecord = {
  id: string;
  updated_at?: Date | string | null;
};

function recordTimestamp(record: BusinessSettingsRecord): number {
  if (!record.updated_at) return 0;
  const timestamp = new Date(record.updated_at).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function latestBusinessSettingsId(
  records: readonly BusinessSettingsRecord[],
): string | null {
  return (
    [...records].sort((left, right) =>
      recordTimestamp(right) - recordTimestamp(left),
    )[0]?.id ?? null
  );
}

export function resolveBusinessSettingsId(
  rawId: unknown,
  records: readonly BusinessSettingsRecord[],
): string | null {
  const submittedId = typeof rawId === "string" ? rawId.trim() : "";
  if (
    submittedId &&
    uuidSchema.safeParse(submittedId).success &&
    records.some((record) => record.id === submittedId)
  ) {
    return submittedId;
  }
  return latestBusinessSettingsId(records);
}

export function isPresetSessionTimeout(value: string | number): boolean {
  const numeric = typeof value === "number" ? value : Number(value.trim());
  return SESSION_TIMEOUT_PRESETS.some((preset) => preset === numeric);
}

export function sessionTimeoutLabel(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (numeric === 15) return "15 Menit";
  if (numeric === 30) return "30 Menit";
  if (numeric === 60) return "1 Jam";
  if (numeric === 120) return "Maksimal 2 Jam";
  return `${Number.isFinite(numeric) ? numeric : String(value)} Menit`;
}

export function parseSessionTimeoutMinutes(
  rawValue: unknown,
  fallbackValue?: unknown,
): number | null {
  const isBlank =
    rawValue === null ||
    rawValue === undefined ||
    (typeof rawValue === "string" && rawValue.trim() === "");
  const candidate = isBlank ? fallbackValue : rawValue;
  if (
    candidate === null ||
    candidate === undefined ||
    (typeof candidate === "string" && candidate.trim() === "")
  ) {
    return null;
  }

  const minutes =
    typeof candidate === "number" ? candidate : Number(String(candidate).trim());
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    return null;
  }
  return minutes;
}
