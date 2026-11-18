import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";

export const instant = false;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-zinc-900">Dashboard BizManage</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/change-password"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Ganti Password
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-600">Anda masuk sebagai</p>
          <p className="mt-1 text-base font-medium text-zinc-900">
            {user?.username} <span className="text-zinc-500">({user?.role})</span>
          </p>
          <p className="mt-4 text-sm text-zinc-600">
            Halaman ini hanya dapat diakses oleh pengguna yang sudah login.
          </p>
        </div>
      </section>
    </main>
  );
}
