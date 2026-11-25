export const INVALID_CREDENTIALS_MESSAGE =
  "Username atau password tidak valid.";
export const LOGIN_UNAVAILABLE_MESSAGE =
  "Login sementara tidak dapat diproses. Silakan coba lagi.";
export const LOGOUT_FAILED_MESSAGE = "Gagal keluar. Silakan coba lagi.";

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 60;

export function resolveSessionTimeoutMinutes(
  configuredMinutes: number | null | undefined,
  fallbackMinutes: number = DEFAULT_SESSION_TIMEOUT_MINUTES,
): number {
  if (typeof configuredMinutes !== "number" || !Number.isFinite(configuredMinutes)) {
    return fallbackMinutes;
  }

  const minutes = Math.floor(configuredMinutes);
  return minutes > 0 ? minutes : fallbackMinutes;
}

export function isSessionExpired(
  expiresAt: Date | string | number,
  now: Date | string | number,
): boolean {
  const expiryTime =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : new Date(expiresAt).getTime();
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (!Number.isFinite(expiryTime) || !Number.isFinite(currentTime)) {
    return true;
  }

  return expiryTime <= currentTime;
}

export function toLoginFieldValue(
  value: FormDataEntryValue | null | undefined,
): string {
  return typeof value === "string" ? value : "";
}

export function getValidationMessage(
  issues: readonly { message?: unknown }[],
  fallback: string = INVALID_CREDENTIALS_MESSAGE,
): string {
  for (const issue of issues) {
    if (typeof issue.message === "string" && issue.message.trim()) {
      return issue.message.trim();
    }
  }

  return fallback;
}
