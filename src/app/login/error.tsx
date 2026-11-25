"use client";

import { Button, primaryButtonClass } from "@/components/ui";
import { LOGIN_UNAVAILABLE_MESSAGE } from "./login-rules";

export default function Error({
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Halaman login tidak dapat dimuat
        </h1>
        <p className="mt-2 text-sm text-slate-600" role="alert">
          {LOGIN_UNAVAILABLE_MESSAGE}
        </p>
        <Button
          type="button"
          onClick={retry ?? reset}
          className={`${primaryButtonClass} mt-6 w-full`}
        >
          Coba Lagi
        </Button>
      </div>
    </main>
  );
}
