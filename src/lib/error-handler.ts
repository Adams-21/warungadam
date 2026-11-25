import { Prisma } from "@prisma/client";

export const GENERIC_ERROR_MESSAGE =
  "Terjadi kesalahan pada sistem. Silakan coba beberapa saat lagi.";

const PRISMA_MESSAGES: Record<string, string> = {
  P1001: "Tidak dapat terhubung ke server database. Pastikan PostgreSQL aktif.",
  P2002: "Data sudah terdaftar (kode/nomor/nama duplikat).",
  P2003: "Data tidak valid atau masih terhubung dengan transaksi lain.",
  P2025: "Data yang dicari tidak ditemukan atau sudah berubah.",
};

const SYSTEM_ERROR_NAMES = new Set([
  "TypeError",
  "ReferenceError",
  "SyntaxError",
  "RangeError",
  "EvalError",
  "URIError",
]);

function getDigest(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" ? digest : null;
}

export function isRedirectError(error: unknown): boolean {
  const digest = getDigest(error);
  if (digest?.startsWith("NEXT_REDIRECT")) return true;
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "RedirectError"
  );
}

function isNotFoundError(error: unknown): boolean {
  return getDigest(error)?.startsWith("NEXT_NOT_FOUND") ?? false;
}

export function getErrorMessage(error: unknown): string {
  if (isRedirectError(error) || isNotFoundError(error)) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return PRISMA_MESSAGES.P1001!;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_MESSAGES[error.code] ?? GENERIC_ERROR_MESSAGE;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return GENERIC_ERROR_MESSAGE;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !SYSTEM_ERROR_NAMES.has(error.name)) {
      return message;
    }
  }

  return GENERIC_ERROR_MESSAGE;
}
