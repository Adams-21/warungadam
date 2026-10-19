"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { Prisma } from "@prisma/client";
import {
  createCategory,
  deleteCategory,
} from "@/app/actions";
import { initialActionState } from "@/app/action-state";

type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: { _count: { select: { products: true } } };
}>;

function DeleteButton({ category }: { category: CategoryWithCount }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const productCount = category._count.products;
  const isDisabled = isPending || productCount > 0;

  function handleDelete() {
    setError(null);
    if (!window.confirm(`Hapus kategori "${category.name}"?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.success) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDisabled}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:hover:bg-red-950"
      >
        {isPending ? "Menghapus..." : "Hapus"}
      </button>
      {productCount > 0 && (
        <span className="text-xs text-zinc-400">Masih dipakai produk</span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export function CategoryManager({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const [state, formAction, isPending] = useActionState(
    createCategory,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="h-fit rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Tambah Kategori</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Buat kategori baru untuk mengelompokkan produk warung.
        </p>

        <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            name="name"
            placeholder="Contoh: Minuman"
            autoComplete="off"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isPending ? "Menyimpan..." : "Simpan Kategori"}
          </button>
        </form>

        {state.message && (
          <p
            role="status"
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              state.success
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
            }`}
          >
            {state.message}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Daftar Kategori</h2>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {categories.length} kategori
          </span>
        </div>

        {categories.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
            Belum ada kategori. Tambahkan kategori pertama lewat form di samping.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama Kategori</th>
                  <th className="px-4 py-3 font-medium">Jumlah Produk</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
                  >
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                        {category._count.products} produk
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DeleteButton category={category} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
