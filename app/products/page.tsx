import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCategories, getProducts } from "@/lib/queries";
import { getCurrentUser, isPinVerified } from "@/lib/auth";
import { ProductManager } from "./product-manager";
import { PinGate } from "@/app/pin-gate";

export const metadata = {
  title: "Produk - WarungAdam",
  description: "Kelola produk WarungAdam.",
};

function ProductSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}

async function ProductData() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pinOk = await isPinVerified(user.id);
  if (!pinOk) {
    return <PinGate storeName={user.storeName} />;
  }

  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <ProductManager
      products={products}
      categories={categories.map(({ id, name }) => ({ id, name }))}
    />
  );
}

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm font-medium text-zinc-400">WarungAdam</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Manajemen Produk</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Tambah, ubah, dan hapus produk warung beserta stok dan harganya.
          </p>
        </header>

        <Suspense fallback={<ProductSkeleton />}>
          <ProductData />
        </Suspense>
      </main>
    </div>
  );
}
