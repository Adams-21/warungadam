import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";

export async function Navbar() {
  const user = await getCurrentUser();
  if (!user) return null;

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/cashier", label: "Kasir" },
    { href: "/products", label: "Produk" },
    { href: "/categories", label: "Kategori" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 font-bold text-emerald-600">WarungAdam</span>
          <span className="truncate rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {user.storeName}
          </span>
        </div>

        <nav
          className="flex items-center gap-4 text-sm font-medium"
          aria-label="Navigasi utama"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-zinc-600 transition-colors hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400"
            >
              {link.label}
            </Link>
          ))}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-red-900/20"
            >
              Logout
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}