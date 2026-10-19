import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getProducts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { CashierClient } from "./cashier-client";

export const metadata = {
  title: "Kasir - WarungAdam",
  description: "Layar kasir / POS WarungAdam.",
};

function CashierSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="h-11 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      </div>
      <div className="h-[420px] animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}

async function CashierData() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const products = await getProducts();
  return <CashierClient products={products} />;
}

export default function CashierPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-6">
          <p className="text-sm font-medium text-zinc-400">WarungAdam</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Kasir / POS</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Pilih produk, atur jumlahnya di keranjang, lalu proses transaksi.
          </p>
        </header>

        <Suspense fallback={<CashierSkeleton />}>
          <CashierData />
        </Suspense>
      </main>
    </div>
  );
}