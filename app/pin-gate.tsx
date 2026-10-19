"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { verifyPin } from "@/app/auth-actions";
import { initialActionState } from "@/app/action-state";

export function PinGate({ storeName }: { storeName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(
    verifyPin,
    initialActionState,
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-zinc-800">
            Halaman Terkunci
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Masukkan PIN laporan 4 digit untuk{" "}
            <span className="font-medium text-zinc-700">{storeName}</span>.
          </p>
        </div>

        <form action={formAction} className="mt-5 flex flex-col gap-3">
          <input
            ref={inputRef}
            name="pin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            pattern="\d{4}"
            required
            placeholder="••••"
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />

          {state.message && !state.success && (
            <p className="text-center text-sm font-medium text-red-600">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {isPending ? "Memeriksa..." : "Buka Halaman"}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-zinc-400">
          PIN default: 1234
        </p>
      </div>
    </div>
  );
}