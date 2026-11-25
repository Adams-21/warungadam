"use client";

import { useActionState, useState } from "react";
import {
  ActionMessage,
  Button,
  Input,
  Label,
  Panel,
  SubmitButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  inputClass,
} from "@/components/ui";
import { CompactActionForm } from "@/components/compact-action-form";
import { SelectField } from "@/components/select-field";
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

type ToggleAction = (formData: FormData) => Promise<ActionState>;

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
    <CompactActionForm
      action={action}
      submitLabel={active ? "Nonaktifkan" : "Aktifkan"}
    >
      <input type="hidden" name="id" value={id} />
    </CompactActionForm>
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
      <Button
        type="button"
        variant="outline"
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Menghapus..." : "Hapus"}
      </Button>
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
          <Label htmlFor="category-name" className="text-sm font-medium">
            Nama kategori
          </Label>
          <Input
            id="category-name"
            name="name"
            required
            className="mt-1 h-10 bg-white"
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
          <Label htmlFor="product-name" className="text-sm font-medium">
            Nama produk
          </Label>
          <Input
            id="product-name"
            name="name"
            required
            className="mt-1 h-10 bg-white"
            placeholder="Contoh: Kopi Sachet"
          />
        </div>
        <div>
          <Label htmlFor="product-category" className="text-sm font-medium">
            Kategori
          </Label>
          <SelectField
            name="category_id"
            defaultValue=""
            id="product-category"
            className="mt-1 h-10 w-full bg-white"
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <Label htmlFor="product-description" className="text-sm font-medium">
            Deskripsi
          </Label>
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
          <Label htmlFor="variant-product" className="text-sm font-medium">
            Produk
          </Label>
          <SelectField
            name="product_id"
            defaultValue=""
            id="variant-product"
            className="mt-1 h-10 w-full bg-white"
          >
            <option value="" disabled>
              Pilih produk
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="variant-name" className="text-sm font-medium">
              Nama varian
            </Label>
            <Input
              id="variant-name"
              name="name"
              required
              className="mt-1 h-10 bg-white"
              placeholder="Contoh: Reguler 65g"
            />
          </div>
          <div>
            <Label htmlFor="variant-unit" className="text-sm font-medium">
              Satuan
            </Label>
            <SelectField
              name="unit_id"
              defaultValue=""
              id="variant-unit"
              className="mt-1 h-10 w-full bg-white"
            >
              <option value="" disabled>
                Pilih satuan
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="variant-price" className="text-sm font-medium">
              Harga jual default
            </Label>
            <Input
              id="variant-price"
              name="default_selling_price"
              type="number"
              min="0"
              step="1"
              required
              className="mt-1 h-10 bg-white"
              placeholder="12000"
            />
          </div>
          <div>
            <Label htmlFor="variant-min-stock" className="text-sm font-medium">
              Stok minimum
            </Label>
            <Input
              id="variant-min-stock"
              name="min_stock"
              type="number"
              min="0"
              step="0.0001"
              className="mt-1 h-10 bg-white"
              placeholder="Opsional"
            />
          </div>
          <div>
            <Label htmlFor="variant-barcode" className="text-sm font-medium">
              Barcode
            </Label>
            <Input
              id="variant-barcode"
              name="barcode"
              className="mt-1 h-10 bg-white"
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
          <Label htmlFor="channel-variant" className="text-sm font-medium">
            Varian
          </Label>
          <SelectField
            name="variant_id"
            defaultValue=""
            id="channel-variant"
            className="mt-1 h-10 w-full bg-white"
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
          </SelectField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="channel-name" className="text-sm font-medium">
              Kanal
            </Label>
            <SelectField
              name="sales_channel_id"
              defaultValue=""
              id="channel-name"
              className="mt-1 h-10 w-full bg-white"
            >
              <option value="" disabled>
                Pilih kanal
              </option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Label htmlFor="channel-price" className="text-sm font-medium">
              Harga jual
            </Label>
            <Input
              id="channel-price"
              name="selling_price"
              type="number"
              min="0"
              step="1"
              required
              className="mt-1 h-10 bg-white"
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
          <Label htmlFor="supplier-variant" className="text-sm font-medium">
            Varian
          </Label>
          <SelectField
            name="variant_id"
            defaultValue=""
            id="supplier-variant"
            className="mt-1 h-10 w-full bg-white"
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
          </SelectField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="supplier-name" className="text-sm font-medium">
              Supplier
            </Label>
            <SelectField
              name="supplier_id"
              defaultValue=""
              id="supplier-name"
              className="mt-1 h-10 w-full bg-white"
            >
              <option value="" disabled>
                Pilih supplier
              </option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Label htmlFor="supplier-price" className="text-sm font-medium">
              Harga beli
            </Label>
            <Input
              id="supplier-price"
              name="purchase_price"
              type="number"
              min="0"
              step="1"
              required
              className="mt-1 h-10 bg-white"
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
        <p className="text-sm text-slate-600">Belum ada produk.</p>
      ) : (
        <Table className="min-w-full divide-y divide-slate-200">
          <TableHeader>
            <TableRow className="hover:bg-teal-50/40">
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Produk</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Varian</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {products.map((product) => (
              <TableRow key={product.id} className="hover:bg-teal-50/40">
                <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <p className="font-medium">{product.name}</p>
                    {product.description ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {product.description}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{product.category_name}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {product.variants.length === 0 ? (
                      <span className="text-xs text-slate-500">
                        Belum ada varian
                      </span>
                    ) : (
                      <ul className="space-y-3">
                        {product.variants.map((variant) => (
                          <li
                            key={variant.id}
                            className="rounded-lg border border-slate-200 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{variant.name}</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {variant.barcode
                                    ? `Barcode ${variant.barcode} · `
                                    : ""}
                                  Satuan {variant.unit_name} · Harga{" "}
                                  {formatRupiah(variant.default_selling_price)}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
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
                                <p className="font-medium text-slate-700">
                                  Harga kanal
                                </p>
                                {variant.channel_prices.length === 0 ? (
                                  <p className="text-slate-500">
                                    Belum diatur
                                  </p>
                                ) : (
                                  <ul className="mt-1 space-y-0.5 text-slate-600">
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
                                <p className="font-medium text-slate-700">
                                  Harga beli supplier
                                </p>
                                {variant.supplier_prices.length === 0 ? (
                                  <p className="text-slate-500">
                                    Belum diatur
                                  </p>
                                ) : (
                                  <ul className="mt-1 space-y-0.5 text-slate-600">
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
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <ToggleForm
                      action={toggleProductActiveAction}
                      id={product.id}
                      active={product.is_active}
                    />
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
        <Table className="min-w-full divide-y divide-slate-200">
          <TableHeader>
            <TableRow className="hover:bg-teal-50/40">
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <TableRow key={category.id} className="hover:bg-teal-50/40">
                <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{category.name}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <ToggleForm
                      action={toggleCategoryActiveAction}
                      id={category.id}
                      active={category.is_active}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {category.product_count === 0 ? (
                      <CategoryDeleteButton categoryId={category.id} />
                    ) : (
                      <span className="text-xs text-slate-500">
                        Digunakan {category.product_count} produk
                      </span>
                    )}
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <ProductsTable products={products} />
    </div>
  );
}
