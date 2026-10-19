import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  getDashboardStats,
  getRecentTransactions,
} from "@/lib/queries";
import { getCurrentUser, isPinVerified } from "@/lib/auth";
import { PinGate } from "./pin-gate";

export const metadata = {
  title: "Dashboard - WarungAdam",
  description: "Ringkasan laporan dan transaksi WarungAdam.",
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const quickLinks = [
  {
    href: "/cashier",
    title: "Kasir / POS",
    description: "Mulai transaksi penjualan baru.",
  },
  {
    href: "/products",
    title: "Manajemen Produk",
    description: "Tambah atau ubah stok & harga produk.",
  },
  {
    href: "/categories",
    title: "Manajemen Kategori",
    description: "Atur pengelompokan produk.",
  },
];

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <p className="text-sm text-zinc-500">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}

async function DashboardData() {
  const [stats, transactions] = await Promise.all([
    getDashboardStats(),
    getRecentTransactions(10),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Ringkasan Statistik</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Pendapatan (Omzet)"
            value={rupiah.format(stats.totalRevenue)}
            accent="bg-green-500"
          />
          <StatCard
            label="Total Transaksi Berhasil"
            value={String(stats.totalTransactions)}
            accent="bg-blue-500"
          />
          <StatCard
            label="Total Produk Terdaftar"
            value={String(stats.totalProducts)}
            accent="bg-amber-500"
          />
          <StatCard
            label="Total Kategori"
            value={String(stats.totalCategories)}
            accent="bg-violet-500"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Riwayat Transaksi Terbaru</h2>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {transactions.length} transaksi
          </span>
        </div>

        {transactions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-400 dark:border-zinc-700">
            Belum ada transaksi. Mulai jualan lewat halaman Kasir.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.map((transaction) => {
              const itemCount = transaction.items.reduce(
                (total, item) => total + item.quantity,
                0,
              );

              return (
                <details
                  key={transaction.id}
                  className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors open:ring-2 open:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:open:ring-zinc-100/10"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
                    <div className="grid min-w-0 flex-1 grid-cols-2 items-center gap-2 text-sm sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      <span
                        className="truncate font-mono text-xs text-zinc-500"
                        title={transaction.id}
                      >
                        #{transaction.id.slice(0, 8)}
                      </span>
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {dateTime.format(transaction.createdAt)}
                      </span>
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {itemCount} item
                      </span>
                      <span className="font-semibold">
                        {rupiah.format(transaction.totalAmount)}
                      </span>
                    </div>
                    <span className="shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180">
                      &#9662;
                    </span>
                  </summary>

                  <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Produk</th>
                          <th className="px-4 py-2.5 font-medium">Qty</th>
                          <th className="px-4 py-2.5 text-right font-medium">
                            Harga / Item
                          </th>
                          <th className="px-4 py-2.5 text-right font-medium">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {transaction.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2.5 font-medium">
                              {item.product.name}
                            </td>
                            <td className="px-4 py-2.5">{item.quantity}</td>
                            <td className="px-4 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
                              {rupiah.format(item.price)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {rupiah.format(item.price * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm font-medium text-zinc-400">WarungAdam</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Selamat Datang di WarungAdam
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Pantau omzet, stok, dan transaksi terbaru warung Anda dalam satu layar.
          </p>
        </header>

        <nav className="mb-10 grid gap-4 sm:grid-cols-3" aria-label="Navigasi cepat">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <span>
                <span className="block font-semibold">{link.title}</span>
                <span className="mt-1 block text-sm text-zinc-500">
                  {link.description}
                </span>
              </span>
              <span className="text-zinc-400 transition-transform duration-200 group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
          ))}
        </nav>

        <Suspense fallback={<DashboardSkeleton />}>
          <ProtectedDashboard />
        </Suspense>
      </main>
    </div>
  );
}

async function ProtectedDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pinOk = await isPinVerified(user.id);
  if (!pinOk) {
    return <PinGate storeName={user.storeName} />;
  }

  return <DashboardData />;
}