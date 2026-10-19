"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Prisma } from "@prisma/client";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/app/actions";
import { initialActionState } from "@/app/action-state";
import {
  expiryLabel,
  expiryTone,
  formatDate,
  getExpiryStatus,
  toDateInputValue,
} from "@/lib/expiry";

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

type CategoryOption = { id: string; name: string };

const SYSTEM_SKU_PREFIX = "PRD-";

function isSystemSku(sku: string | null) {
  return !!sku && sku.startsWith(SYSTEM_SKU_PREFIX);
}

function generateSku(existing: Set<string>) {
  let sku = "";
  do {
    sku = `${SYSTEM_SKU_PREFIX}${Math.floor(1000 + Math.random() * 9000)}`;
  } while (existing.has(sku));
  return sku;
}

function withAutoSku(formData: FormData, existing: Set<string>) {
  const sku = String(formData.get("sku") ?? "").trim();
  if (!sku) {
    formData.set("sku", generateSku(existing));
  }
  return formData;
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatRupiah(value: number) {
  return rupiah.format(value);
}

function Banner({ state }: { state: { success: boolean; message: string } }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm ${
        state.success
          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
          : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
      }`}
    >
      {state.message}
    </p>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg px-2 py-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            &#10005;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";

function ProductFields({
  categories,
  product,
}: {
  categories: CategoryOption[];
  product?: ProductWithCategory;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="font-medium">Nama Produk</span>
        <input
          name="name"
          required
          autoComplete="off"
          defaultValue={product?.name}
          placeholder="Contoh: Teh Botol"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">SKU (opsional)</span>
        <input
          name="sku"
          autoComplete="off"
          defaultValue={product?.sku ?? ""}
          placeholder="Contoh: TBR-001"
          className={inputClass}
        />
        <span className="text-xs text-zinc-400">
          Kosongkan untuk dibuat otomatis dengan format PRD-XXXX.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Kategori</span>
        <select
          name="categoryId"
          required
          defaultValue={product?.categoryId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Pilih kategori
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Stok</span>
        <input
          type="number"
          name="stock"
          min={0}
          step={1}
          defaultValue={product?.stock ?? 0}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Harga Beli</span>
        <input
          type="number"
          name="buyPrice"
          min={0}
          step="any"
          required
          defaultValue={product?.buyPrice ?? ""}
          placeholder="0"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Harga Jual</span>
        <input
          type="number"
          name="sellPrice"
          min={0}
          step="any"
          required
          defaultValue={product?.sellPrice ?? ""}
          placeholder="0"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="font-medium">Tanggal Kedaluwarsa (opsional)</span>
        <input
          type="date"
          name="expiredAt"
          defaultValue={toDateInputValue(product?.expiredAt)}
          className={inputClass}
        />
        <span className="text-xs text-zinc-400">
          Kosongkan jika produk tidak memiliki tanggal kedaluwarsa.
        </span>
      </label>
    </div>
  );
}

function SubmitRow({
  isPending,
  onClose,
  submitLabel,
}: {
  isPending: boolean;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending ? "Menyimpan..." : submitLabel}
      </button>
    </div>
  );
}

function CreateProductModal({
  categories,
  existingSkus,
  onClose,
}: {
  categories: CategoryOption[];
  existingSkus: Set<string>;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createProduct,
    initialActionState,
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state, onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    formAction(withAutoSku(new FormData(event.currentTarget), existingSkus));
  }

  return (
    <Modal title="Tambah Produk" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ProductFields categories={categories} />
        <Banner state={state} />
        <SubmitRow isPending={isPending} onClose={onClose} submitLabel="Simpan Produk" />
      </form>
    </Modal>
  );
}

function EditProductModal({
  product,
  categories,
  onClose,
}: {
  product: ProductWithCategory;
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateProduct,
    initialActionState,
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state, onClose]);

  return (
    <Modal title="Edit Produk" onClose={onClose}>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={product.id} />
        <ProductFields categories={categories} product={product} />
        <Banner state={state} />
        <SubmitRow isPending={isPending} onClose={onClose} submitLabel="Simpan Perubahan" />
      </form>
    </Modal>
  );
}

function DeleteButton({ product }: { product: ProductWithCategory }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return;

    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (!result.success) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:hover:bg-red-950"
      >
        {isPending ? "Menghapus..." : "Hapus"}
      </button>
      {error && <span className="max-w-[180px] text-right text-xs text-red-500">{error}</span>}
    </div>
  );
}

function SkuCell({ sku }: { sku: string | null }) {
  if (!sku) {
    return <span className="text-xs text-zinc-400">-</span>;
  }

  if (!isSystemSku(sku)) {
    return <span className="font-mono text-xs text-zinc-500">{sku}</span>;
  }

  return (
    <span
      title="SKU dibuat otomatis oleh sistem"
      className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
      {sku}
    </span>
  );
}

function ExpiryCell({ expiredAt }: { expiredAt: Date | null }) {
  const status = getExpiryStatus(expiredAt);

  if (!expiredAt || !status) {
    return <span className="text-xs text-zinc-400">-</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-xs text-zinc-500">{formatDate(expiredAt)}</span>
      <span
        className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${expiryTone(status)}`}
      >
        {expiryLabel(status)}
      </span>
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  const tone =
    stock === 0
      ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
      : stock <= 5
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
        : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {stock}
    </span>
  );
}

export function ProductManager({
  products,
  categories,
}: {
  products: ProductWithCategory[];
  categories: CategoryOption[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ProductWithCategory | null>(null);

  const existingSkus = useMemo(
    () =>
      new Set(
        products
          .map((product) => product.sku)
          .filter((sku): sku is string => Boolean(sku)),
      ),
    [products],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Daftar Produk</h2>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {products.length} produk
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + Tambah Produk
        </button>
      </div>

      {categories.length === 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          Belum ada kategori. Buat kategori dulu di halaman Kategori sebelum menambah produk.
        </p>
      )}

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-400 dark:border-zinc-700">
          Belum ada produk. Klik &quot;+ Tambah Produk&quot; untuk mulai berjualan.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">Nama Produk</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Stok</th>
                <th className="px-4 py-3 font-medium">Harga Beli</th>
                <th className="px-4 py-3 font-medium">Harga Jual</th>
                <th className="px-4 py-3 font-medium">Kedaluwarsa</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
                >
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">
                    <SkuCell sku={product.sku} />
                  </td>
                  <td className="px-4 py-3">
                    <StockBadge stock={product.stock} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatRupiah(product.buyPrice)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatRupiah(product.sellPrice)}
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryCell expiredAt={product.expiredAt} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                      {product.category.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(product)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                      <DeleteButton product={product} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateProductModal
          categories={categories}
          existingSkus={existingSkus}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editing && (
        <EditProductModal
          product={editing}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
