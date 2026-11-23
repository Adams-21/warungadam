"use client";

import { useActionState, useState } from "react";
import {
  ActionMessage,
  Panel,
  SubmitButton,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { formatNumber, formatRupiah } from "@/lib/format";
import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
  createVariantAction,
  toggleCategoryActiveAction,
  toggleProductActiveAction,
  toggleVariantActiveAction,
  upsertChannelPriceAction,
  upsertSupplierPriceAction,
} from "./actions";
import type {
  CategoryView,
  ChannelView,
  ProductView,
  SupplierView,
  UnitView,
} from "./types";

type ToggleAction = (formData: FormData) => Promise<void>;

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

function ToggleForm({
  action,
  id,
  active,
}: {
  action: ToggleAction;
  id: string;
  active: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={secondaryButtonClass}>
        {active ? "Nonaktifkan" : "Aktifkan"}
      </button>
    </form>
  );
}

function CategoryDeleteButton({ categoryId }: { categoryId: string }) {
  const [state, setState] = useState<ActionState>(EMPTY_ACTION_STATE);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      setState(await deleteCategoryAction(categoryId));
    } catch {
      setState({ error: "Gagal menghapus kategori." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Menghapus..." : "Hapus"}
      </button>
      <ActionMessage state={state} />
    </div>
  );
}

function CategoryForm({ categories }: { categories: CategoryView[] }) {
  const [state, formAction, pending] = useActionState(
    createCategoryAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Tambah Kategori"
      description={`Terdapat ${categories.length} kategori saat ini.`}
    >
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="category-name" className="text-sm font-medium">
            Nama kategori
          </label>
          <input
            id="category-name"
            name="name"
            required
            className={inputClass}
            placeholder="Contoh: Makanan Ringan"
          />
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Kategori</SubmitButton>
      </form>
    </Panel>
  );
}

function ProductForm({ categories }: { categories: CategoryView[] }) {
  const [state, formAction, pending] = useActionState(
    createProductAction,
    EMPTY_ACTION_STATE,
  );
  const activeCategories = categories.filter((category) => category.is_active);

  return (
    <Panel title="Tambah Produk" description="Produk dikelompokkan per kategori.">
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="product-name" className="text-sm font-medium">
            Nama produk
          </label>
          <input
            id="product-name"
            name="name"
            required
            className={inputClass}
            placeholder="Contoh: Kopi Sachet"
          />
        </div>
        <div>
          <label htmlFor="product-category" className="text-sm font-medium">
            Kategori
          </label>
          <select
            id="product-category"
            name="category_id"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="product-description" className="text-sm font-medium">
            Deskripsi
          </label>
          <textarea
            id="product-description"
            name="description"
            rows={2}
            className={inputClass}
            placeholder="Opsional"
          />
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Produk</SubmitButton>
      </form>
    </Panel>
  );
}

function VariantForm({
  products,
  units,
}: {
  products: ProductView[];
  units: UnitView[];
}) {
  const [state, formAction, pending] = useActionState(
    createVariantAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Tambah Varian"
      description="Setiap varian memiliki harga jual default dan satuan."
    >
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="variant-product" className="text-sm font-medium">
            Produk
          </label>
          <select
            id="variant-product"
            name="product_id"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Pilih produk
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="variant-name" className="text-sm font-medium">
              Nama varian
            </label>
            <input
              id="variant-name"
              name="name"
              required
              className={inputClass}
              placeholder="Contoh: Reguler 65g"
            />
          </div>
          <div>
            <label htmlFor="variant-unit" className="text-sm font-medium">
              Satuan
            </label>
            <select
              id="variant-unit"
              name="unit_id"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Pilih satuan
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="variant-price" className="text-sm font-medium">
              Harga jual default
            </label>
            <input
              id="variant-price"
              name="default_selling_price"
              type="number"
              min="0"
              step="1"
              required
              className={inputClass}
              placeholder="12000"
            />
          </div>
          <div>
            <label htmlFor="variant-min-stock" className="text-sm font-medium">
              Stok minimum
            </label>
            <input
              id="variant-min-stock"
              name="min_stock"
              type="number"
              min="0"
              step="0.0001"
              className={inputClass}
              placeholder="Opsional"
            />
          </div>
          <div>
            <label htmlFor="variant-barcode" className="text-sm font-medium">
              Barcode
            </label>
            <input
              id="variant-barcode"
              name="barcode"
              className={inputClass}
              placeholder="Opsional"
            />
          </div>
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Varian</SubmitButton>
      </form>
    </Panel>
  );
}

function ChannelPriceForm({
  products,
  channels,
}: {
  products: ProductView[];
  channels: ChannelView[];
}) {
  const [state, formAction, pending] = useActionState(
    upsertChannelPriceAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Harga per Kanal"
      description="Isi harga khusus untuk kanal tertentu; mengisi ulang akan memperbarui harga."
    >
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="channel-variant" className="text-sm font-medium">
            Varian
          </label>
          <select
            id="channel-variant"
            name="variant_id"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Pilih varian
            </option>
            {products.flatMap((product) =>
              product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {product.name} - {variant.name}
                </option>
              )),
            )}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="channel-name" className="text-sm font-medium">
              Kanal
            </label>
            <select
              id="channel-name"
              name="sales_channel_id"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Pilih kanal
              </option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="channel-price" className="text-sm font-medium">
              Harga jual
            </label>
            <input
              id="channel-price"
              name="selling_price"
              type="number"
              min="0"
              step="1"
              required
              className={inputClass}
              placeholder="13000"
            />
          </div>
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Simpan Harga Kanal</SubmitButton>
      </form>
    </Panel>
  );
}

function SupplierPriceForm({
  products,
  suppliers,
}: {
  products: ProductView[];
  suppliers: SupplierView[];
}) {
  const [state, formAction, pending] = useActionState(
    upsertSupplierPriceAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Harga Beli Supplier"
      description="Daftar harga beli per varian dan supplier."
    >
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="supplier-variant" className="text-sm font-medium">
            Varian
          </label>
          <select
            id="supplier-variant"
            name="variant_id"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Pilih varian
            </option>
            {products.flatMap((product) =>
              product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {product.name} - {variant.name}
                </option>
              )),
            )}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="supplier-name" className="text-sm font-medium">
              Supplier
            </label>
            <select
              id="supplier-name"
              name="supplier_id"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Pilih supplier
              </option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="supplier-price" className="text-sm font-medium">
              Harga beli
            </label>
            <input
              id="supplier-price"
              name="purchase_price"
              type="number"
              min="0"
              step="1"
              required
              className={inputClass}
              placeholder="8000"
            />
          </div>
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Simpan Harga Beli</SubmitButton>
      </form>
    </Panel>
  );
}

function ProductsTable({ products }: { products: ProductView[] }) {
  return (
    <Panel
      title="Daftar Produk & Varian"
      description={`${products.length} produk terdaftar.`}
    >
      {products.length === 0 ? (
        <p className="text-sm text-zinc-600">Belum ada produk.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead>
              <tr>
                <th className={thClass}>Produk</th>
                <th className={thClass}>Kategori</th>
                <th className={thClass}>Varian</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className={tdClass}>
                    <p className="font-medium">{product.name}</p>
                    {product.description ? (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {product.description}
                      </p>
                    ) : null}
                  </td>
                  <td className={tdClass}>{product.category_name}</td>
                  <td className={tdClass}>
                    {product.variants.length === 0 ? (
                      <span className="text-xs text-zinc-500">
                        Belum ada varian
                      </span>
                    ) : (
                      <ul className="space-y-3">
                        {product.variants.map((variant) => (
                          <li
                            key={variant.id}
                            className="rounded-lg border border-zinc-200 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{variant.name}</p>
                                <p className="mt-0.5 text-xs text-zinc-500">
                                  {variant.barcode
                                    ? `Barcode ${variant.barcode} · `
                                    : ""}
                                  Satuan {variant.unit_name} · Harga{" "}
                                  {formatRupiah(variant.default_selling_price)}
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-500">
                                  Stok {formatNumber(variant.stock_qty, 4)} ·
                                  Rusak{" "}
                                  {formatNumber(variant.damaged_stock_qty, 4)} ·
                                  Min.{" "}
                                  {variant.min_stock === null
                                    ? "-"
                                    : formatNumber(variant.min_stock, 4)}
                                </p>
                              </div>
                              <ToggleForm
                                action={toggleVariantActiveAction}
                                id={variant.id}
                                active={variant.is_active}
                              />
                            </div>
                            <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                              <div>
                                <p className="font-medium text-zinc-700">
                                  Harga kanal
                                </p>
                                {variant.channel_prices.length === 0 ? (
                                  <p className="text-zinc-500">
                                    Belum diatur
                                  </p>
                                ) : (
                                  <ul className="mt-1 space-y-0.5 text-zinc-600">
                                    {variant.channel_prices.map((price) => (
                                      <li key={price.id}>
                                        {price.channel_name}:{" "}
                                        {formatRupiah(price.selling_price)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-zinc-700">
                                  Harga beli supplier
                                </p>
                                {variant.supplier_prices.length === 0 ? (
                                  <p className="text-zinc-500">
                                    Belum diatur
                                  </p>
                                ) : (
                                  <ul className="mt-1 space-y-0.5 text-zinc-600">
                                    {variant.supplier_prices.map((price) => (
                                      <li key={price.id}>
                                        {price.supplier_name}:{" "}
                                        {formatRupiah(price.purchase_price)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={tdClass}>
                    <ToggleForm
                      action={toggleProductActiveAction}
                      id={product.id}
                      active={product.is_active}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function ProductsManager({
  categories,
  products,
  units,
  channels,
  suppliers,
}: {
  categories: CategoryView[];
  products: ProductView[];
  units: UnitView[];
  channels: ChannelView[];
  suppliers: SupplierView[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <CategoryForm categories={categories} />
        <ProductForm categories={categories} />
        <VariantForm products={products} units={units} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelPriceForm products={products} channels={channels} />
        <SupplierPriceForm products={products} suppliers={suppliers} />
      </div>

      <Panel
        title="Daftar Kategori"
        description="Nonaktifkan kategori untuk menyembunyikannya dari pilihan."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead>
              <tr>
                <th className={thClass}>Nama</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className={tdClass}>{category.name}</td>
                  <td className={tdClass}>
                    <ToggleForm
                      action={toggleCategoryActiveAction}
                      id={category.id}
                      active={category.is_active}
                    />
                  </td>
                  <td className={tdClass}>
                    {category.product_count === 0 ? (
                      <CategoryDeleteButton categoryId={category.id} />
                    ) : (
                      <span className="text-xs text-zinc-500">
                        Digunakan {category.product_count} produk
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <ProductsTable products={products} />
    </div>
  );
}
