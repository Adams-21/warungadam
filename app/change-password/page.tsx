import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const instant = false;

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Ganti Password</h1>
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
