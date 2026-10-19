import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCategories } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { CategoryManager } from "./category-manager";

export const metadata = {
  title: "Kategori - WarungAdam",
  description: "Kelola kategori produk WarungAdam.",
};

function CategorySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="h-48 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      <div className="h-48 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}

async function CategoryData() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const categories = await getCategories();
  return <CategoryManager categories={categories} />;
}

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm font-medium text-zinc-400">WarungAdam</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Manajemen Kategori</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Kelola kategori untuk mengelompokkan produk warung Anda.
          </p>
        </header>

        <Suspense fallback={<CategorySkeleton />}>
          <CategoryData />
        </Suspense>
      </main>
    </div>
  );
}
