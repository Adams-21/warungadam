export type ExpiryStatus = "expired" | "soon" | "safe";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SOON_THRESHOLD_DAYS = 30;

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function getExpiryStatus(
  expiredAt: Date | string | null | undefined,
  now: Date = new Date(),
): ExpiryStatus | null {
  if (!expiredAt) return null;

  const target = new Date(expiredAt);
  if (Number.isNaN(target.getTime())) return null;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );

  const diffDays = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / DAY_IN_MS,
  );

  if (diffDays < 0) return "expired";
  if (diffDays <= SOON_THRESHOLD_DAYS) return "soon";
  return "safe";
}

export function expiryLabel(status: ExpiryStatus) {
  if (status === "expired") return "Expired";
  if (status === "soon") return "Segera Expired";
  return "Aman";
}

export function expiryTone(status: ExpiryStatus) {
  if (status === "expired") {
    return "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400";
  }
  if (status === "soon") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
  }
  return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400";
}