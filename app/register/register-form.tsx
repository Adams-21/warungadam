"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerStore } from "@/app/auth-actions";
import { initialActionState } from "@/app/action-state";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerStore,
    initialActionState,
  );

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-emerald-600">WarungAdam</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Daftar Toko Baru
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Satu akun per toko. PIN laporan default: <b>1234</b>.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="storeName"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Nama Toko
          </label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            required
            placeholder="Contoh: Warung Adam Madura"
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="username"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            autoComplete="username"
            placeholder="Minimal 3 karakter"
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={4}
            autoComplete="new-password"
            placeholder="Minimal 4 karakter"
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {state.message && (
          <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {isPending ? "Mendaftarkan..." : "Daftarkan Toko"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-600 hover:underline"
        >
          Login di sini
        </Link>
      </p>
    </div>
  );
}