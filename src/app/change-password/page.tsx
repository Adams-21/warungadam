import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const instant = false;

export default async function ChangePasswordPage() {
  await requireAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Ganti Password
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Perbarui password akun pengelola Anda.
        </p>
        <ChangePasswordForm />
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </main>
  );
}
