"use client";

import { Button, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import Link from "next/link";

type ErrorFallbackProps = {
  error: unknown;
  reset: () => void;
  title?: string;
  description?: string;
};

function getErrorDetail(error: unknown): string | null {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return null;
}

function getErrorDigest(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.trim() ? digest : null;
}

export function ErrorFallback({
  error,
  reset,
  title = "Terjadi kendala pada halaman ini",
  description = "Halaman tidak dapat ditampilkan sementara ini. Silakan coba lagi atau kembali ke dashboard.",
}: ErrorFallbackProps) {
  const detail = getErrorDetail(error);
  const digest = getErrorDigest(error);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            />
          </svg>
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>

        {detail ? (
          <p className="mt-5 rounded-md bg-slate-50 p-3 text-left text-xs text-slate-600">
            Detail: {detail}
          </p>
        ) : null}
        {digest ? (
          <p className="mt-2 text-left text-xs text-slate-500">
            Kode error: <span className="font-mono">{digest}</span>
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset} className={primaryButtonClass}>
            Coba Lagi
          </Button>
          <Link href="/dashboard" className={secondaryButtonClass}>
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
