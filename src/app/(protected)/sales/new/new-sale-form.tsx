"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import {
  ActionMessage,
  Badge,
  Button,
  Input,
  Label,
  Panel,
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { parseStrictDateInput } from "@/lib/date-range";
import { formatNumber, formatRupiah } from "@/lib/format";
import { materialOptionLabel } from "@/lib/option-labels";
import { createSaleAction } from "../actions";
import { resolveDefaultSalesChannelId } from "../sales-channel-helpers";
import {
  DEFAULT_PACKAGE_COUNT,
  resolvePackageCount,
} from "../sales-form-helpers";
import type {
  SaleChannelOptionView,
  SalePackagingMaterialView,
  SalePackageSizeView,
  SaleVariantOptionView,
} from "../types";
import {
  SALE_PAYMENT_METHODS,
  SALE_PAYMENT_STATUS_INPUTS,
} from "../types";
import {
  addPosVariant,
  capPosQty,
  filterPosVariants,
  getPosCartQty,
  resolvePosVariantPrice,
  type PosCartRow,
} from "./pos-helpers";

type ItemRow = PosCartRow;

type ExtraMaterialRow = {
  key: number;
  packaging_material_id: string;
  extra_usage_qty: string;
};

function rupiah(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function NewSaleForm({
  channels,
  variants,
  packageSizes,
  materials,
  adminFeeRate,
  today,
}: {
  channels: SaleChannelOptionView[];
  variants: SaleVariantOptionView[];
  packageSizes: SalePackageSizeView[];
  materials: SalePackagingMaterialView[];
  adminFeeRate: number;
  today: string;
}) {
  const nextItemKey = useRef(1);
  const nextExtraKey = useRef(0);
  const [channelId, setChannelId] = useState(() =>
    resolveDefaultSalesChannelId(channels),
  );
  const [packageSizeId, setPackageSizeId] = useState("");
  const [packageCount, setPackageCount] = useState(String(DEFAULT_PACKAGE_COUNT));
  const [discountAmount, setDiscountAmount] = useState("0");
  const [additionalFee, setAdditionalFee] = useState("0");
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>(
    SALE_PAYMENT_STATUS_INPUTS[0],
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [extraRows, setExtraRows] = useState<ExtraMaterialRow[]>([]);
  const [usageOverrides, setUsageOverrides] = useState<Record<string, string>>(
    {},
  );
  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const rawDate = formData.get("transaction_date");
      if (typeof rawDate !== "string" || !parseStrictDateInput(rawDate)) {
        return { error: "Tanggal transaksi tidak valid." };
      }
      return createSaleAction(prevState, formData);
    },
    EMPTY_ACTION_STATE,
  );

  const selectedChannel = channels.find((channel) => channel.id === channelId);
  const selectedSize = packageSizes.find((size) => size.id === packageSizeId);
  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  const filteredVariants = useMemo(
    () => filterPosVariants(variants, search),
    [variants, search],
  );

  function usageFor(item: SalePackageSizeView["items"][number]): string {
    const override = usageOverrides[item.packaging_material_id];
    if (override !== undefined) return override;
    return String(item.default_usage_qty * resolvePackageCount(packageCount));
  }

  function priceForVariant(variantId: string, selectedChannelId = channelId) {
    const variant = variantMap.get(variantId);
    if (!variant) return "";
    return resolvePosVariantPrice(variant, selectedChannelId);
  }

  function handleChannelChange(value: string) {
    setChannelId(value);
    setRows((current) =>
      current.map((row) =>
        row.variant_id
          ? {
              ...row,
              unit_selling_price: priceForVariant(row.variant_id, value),
            }
          : row,
      ),
    );
  }

  function updateRow(key: number, patch: Partial<ItemRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.variant_id !== undefined) {
          next.unit_selling_price = priceForVariant(patch.variant_id);
        }
        return next;
      }),
    );
  }

  function handleVariantTap(variant: SaleVariantOptionView) {
    const result = addPosVariant(rows, variant, channelId, nextItemKey.current);
    setRows(result.rows);
    nextItemKey.current = result.nextKey;
  }

  function changeRowQty(row: ItemRow, value: string) {
    const variant = variantMap.get(row.variant_id);
    updateRow(row.key, { qty: capPosQty(value, variant?.stock_qty ?? 0) });
  }

  function stepRowQty(row: ItemRow, delta: number) {
    const variant = variantMap.get(row.variant_id);
    const next = (Number(row.qty) || 0) + delta;
    updateRow(row.key, { qty: capPosQty(next, variant?.stock_qty ?? 0) });
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function addExtraRow() {
    setExtraRows((current) => [
      ...current,
      {
        key: nextExtraKey.current++,
        packaging_material_id: "",
        extra_usage_qty: "1",
      },
    ]);
  }

  function updateExtraRow(key: number, patch: Partial<ExtraMaterialRow>) {
    setExtraRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  const itemSubtotal = rows.reduce((sum, row) => {
    const gross = rupiah(
      (Number(row.qty) || 0) * (Number(row.unit_selling_price) || 0),
    );
    return sum + Math.max(0, gross - Math.max(0, Number(row.item_discount) || 0));
  }, 0);
  const headerDiscount = Math.max(0, Number(discountAmount) || 0);
  const fee = Math.max(0, Number(additionalFee) || 0);
  const totalRevenue = Math.max(0, itemSubtotal - headerDiscount + fee);

  const productCogs = rows.reduce((sum, row) => {
    const variant = variantMap.get(row.variant_id);
    return sum + rupiah((Number(row.qty) || 0) * (variant?.cost_hint ?? 0));
  }, 0);

  const standardPackagingCogs = (selectedSize?.items ?? []).reduce(
    (sum, item) =>
      sum +
      rupiah((Number(usageFor(item)) || 0) * item.average_unit_cost),
    0,
  );
  const extraPackagingCogs = extraRows.reduce((sum, row) => {
    const material = materialMap.get(row.packaging_material_id);
    return (
      sum +
      rupiah(
        (Number(row.extra_usage_qty) || 0) * (material?.average_unit_cost ?? 0),
      )
    );
  }, 0);
  const packagingCogs = standardPackagingCogs + extraPackagingCogs;
  const totalCogs = productCogs + packagingCogs;
  const adminFee = selectedChannel?.is_marketplace
    ? rupiah(((itemSubtotal - headerDiscount) * adminFeeRate) / 100)
    : 0;
  const grossProfit = totalRevenue - totalCogs;
  const netGrossProfit = totalRevenue - adminFee - totalCogs;
  const itemCount = rows.reduce((sum, row) => sum + (Number(row.qty) || 0), 0);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <Panel
            title="Katalog Produk Cepat"
            description="Ketuk kartu produk untuk menambah 1 item; kuantitas otomatis dibatasi sisa stok."
          >
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama produk atau varian..."
                className="h-12 pl-10 pr-3 text-base"
                aria-label="Cari produk atau varian"
              />
            </div>

            {filteredVariants.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Tidak ada varian yang cocok dengan pencarian.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredVariants.map((variant) => {
                  const cartQty = getPosCartQty(rows, variant.id);
                  const remaining = Math.max(0, variant.stock_qty - cartQty);
                  const disabled = remaining <= 0;
                  const price = Number(resolvePosVariantPrice(variant, channelId));

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={disabled}
                      aria-label={`Tambah ${variant.label}`}
                      onClick={() => handleVariantTap(variant)}
                      className="flex min-h-[10rem] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-teal-400 hover:bg-teal-50/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:bg-white"
                    >
                      <span className="block">
                        <span className="block break-words text-sm font-semibold leading-snug text-slate-900">
                          {variant.label}
                        </span>
                        <span className="mt-1 block text-base font-bold text-teal-700">
                          {formatRupiah(price)}
                        </span>
                      </span>
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          className={
                            disabled
                              ? "border-slate-200 bg-slate-100 text-slate-500"
                              : "border-teal-200 bg-teal-50 text-teal-700"
                          }
                        >
                          {disabled
                            ? "Stok habis"
                            : `Sisa ${formatNumber(variant.stock_qty, 4)} ${variant.unit_name}`}
                        </Badge>
                        {cartQty > 0 ? (
                          <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                            {formatNumber(cartQty, 4)} di keranjang
                          </Badge>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>
        </section>

        <aside className="self-start lg:col-span-5 lg:sticky lg:top-4">
          <Panel
            title="Keranjang & Pembayaran"
            description="Pilih kanal, susun item, lalu selesaikan transaksi."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="sales_channel_id" className="text-sm font-medium">
                  Kanal Penjualan
                </Label>
                <SelectField
                  name="sales_channel_id"
                  defaultValue={channelId}
                  id="sales_channel_id"
                  className="mt-1 h-11 w-full bg-white"
                  placeholder="Pilih kanal"
                  onValueChange={handleChannelChange}
                >
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                      {channel.is_marketplace ? " (marketplace)" : ""}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <Label htmlFor="package_size_id" className="text-sm font-medium">
                  Ukuran Paket Kemasan
                </Label>
                <SelectField
                  name="package_size_id"
                  defaultValue={packageSizeId}
                  id="package_size_id"
                  className="mt-1 h-11 w-full bg-white"
                  onValueChange={(value) => {
                    setPackageSizeId(value);
                    setUsageOverrides({});
                  }}
                >
                  <option value="">Tanpa kemasan standar</option>
                  {packageSizes.map((size) => (
                    <option key={size.id} value={size.id}>
                      {size.name}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="mt-3 sm:max-w-[12rem]">
              <Label htmlFor="package_count" className="text-sm font-medium">
                Jumlah Paket
              </Label>
              <Input
                id="package_count"
                name="package_count"
                type="number"
                min="0.0001"
                step="0.0001"
                disabled={!selectedSize}
                value={packageCount}
                onChange={(event) => {
                  setPackageCount(event.target.value);
                  setUsageOverrides({});
                }}
                className="mt-1 h-11 bg-white"
              />
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-900">Keranjang</h3>
              {rows.length === 0 ? (
                <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Belum ada item. Ketuk produk di katalog untuk menambah.
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {rows.map((row) => {
                    const variant = variantMap.get(row.variant_id);
                    const subtotal = Math.max(
                      0,
                      rupiah(
                        (Number(row.qty) || 0) *
                          (Number(row.unit_selling_price) || 0),
                      ) - Math.max(0, Number(row.item_discount) || 0),
                    );

                    return (
                      <div
                        key={row.key}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                      >
                        <input type="hidden" name="variant_id" value={row.variant_id} />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-slate-900">
                              {variant?.label ?? "Varian tidak ditemukan"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatRupiah(Number(row.unit_selling_price) || 0)} /{" "}
                              {variant?.unit_name ?? "unit"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus ${variant?.label ?? "item"}`}
                            onClick={() => removeRow(row.key)}
                            className="text-rose-600"
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10"
                              aria-label="Kurangi jumlah"
                              disabled={(Number(row.qty) || 0) <= 0}
                              onClick={() => stepRowQty(row, -1)}
                            >
                              <MinusIcon />
                            </Button>
                            <Input
                              name="qty"
                              type="number"
                              inputMode="decimal"
                              min="0.0001"
                              step="0.0001"
                              max={variant?.stock_qty}
                              required
                              value={row.qty}
                              onChange={(event) =>
                                changeRowQty(row, event.target.value)
                              }
                              className="h-10 w-20 text-center text-base font-semibold"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10"
                              aria-label="Tambah jumlah"
                              disabled={
                                !!variant &&
                                (Number(row.qty) || 0) >= variant.stock_qty
                              }
                              onClick={() => stepRowQty(row, 1)}
                            >
                              <PlusIcon />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatRupiah(subtotal)}
                            </p>
                            {Number(row.item_discount) > 0 ? (
                              <p className="text-xs text-slate-500">
                                Diskon {formatRupiah(Number(row.item_discount))}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <input type="hidden" name="unit_price" value={row.unit_selling_price} />
                        <input type="hidden" name="item_discount" value={row.item_discount} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5">
              <Label>Status Pembayaran</Label>
              <input type="hidden" name="payment_status" value={paymentStatus} />
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <Button
                  type="button"
                  variant={paymentStatus === "Lunas" ? "default" : "ghost"}
                  aria-pressed={paymentStatus === "Lunas"}
                  onClick={() => setPaymentStatus("Lunas")}
                  className="h-11 rounded-lg text-sm font-semibold"
                >
                  Lunas
                </Button>
                <Button
                  type="button"
                  variant={
                    paymentStatus === "Belum_dibayar" ? "default" : "ghost"
                  }
                  aria-pressed={paymentStatus === "Belum_dibayar"}
                  onClick={() => setPaymentStatus("Belum_dibayar")}
                  className="h-11 rounded-lg text-sm font-semibold"
                >
                  Belum Dibayar
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="payment_method" className="text-sm font-medium">
                Metode Pembayaran
              </Label>
              <SelectField
                name="payment_method"
                id="payment_method"
                defaultValue={SALE_PAYMENT_METHODS[0]}
                className="mt-1 h-11 w-full bg-white"
              >
                {SALE_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <Button
                type="button"
                variant="ghost"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((open) => !open)}
                className="flex h-12 w-full justify-between rounded-none px-3 text-sm font-semibold text-slate-800"
              >
                Opsi Tambahan & Rincian Kemasan
                {advancedOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Button>
              <div
                className={
                  advancedOpen
                    ? "space-y-4 border-t border-slate-200 p-3"
                    : "hidden"
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="transaction_date" className="text-sm font-medium">
                      Tanggal Transaksi
                    </Label>
                    <Input
                      id="transaction_date"
                      name="transaction_date"
                      type="date"
                      required
                      defaultValue={today}
                      className="mt-1 h-11 bg-white"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="external_order_number"
                      className="text-sm font-medium"
                    >
                      No. Order / Resi Eksternal
                    </Label>
                    <Input
                      id="external_order_number"
                      name="external_order_number"
                      className="mt-1 h-11 bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount_amount" className="text-sm font-medium">
                      Diskon Transaksi
                    </Label>
                    <Input
                      id="discount_amount"
                      name="discount_amount"
                      type="number"
                      min="0"
                      step="1"
                      value={discountAmount}
                      onChange={(event) => setDiscountAmount(event.target.value)}
                      className="mt-1 h-11 bg-white"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="additional_fee_amount"
                      className="text-sm font-medium"
                    >
                      Biaya Tambahan Pelanggan
                    </Label>
                    <Input
                      id="additional_fee_amount"
                      name="additional_fee_amount"
                      type="number"
                      min="0"
                      step="1"
                      value={additionalFee}
                      onChange={(event) => setAdditionalFee(event.target.value)}
                      className="mt-1 h-11 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Pemakaian Kemasan
                  </h3>
                  {selectedSize ? (
                    <div className="mt-2 space-y-2">
                      {selectedSize.items.map((item) => (
                        <div
                          key={item.packaging_material_id}
                          className="rounded-lg border border-slate-200 p-2"
                        >
                          <input
                            type="hidden"
                            name="packaging_material_id"
                            value={item.packaging_material_id}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-medium text-slate-800">
                                {item.material_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                Standar {formatNumber(item.default_usage_qty, 4)}{" "}
                                {item.usage_unit_name} · Stok{" "}
                                {formatNumber(item.stock_qty, 4)}
                              </p>
                            </div>
                            <Input
                              name="actual_usage_qty"
                              type="number"
                              min="0"
                              step="0.0001"
                              value={usageFor(item)}
                              onChange={(event) =>
                                setUsageOverrides((current) => ({
                                  ...current,
                                  [item.packaging_material_id]: event.target.value,
                                }))
                              }
                              className="h-9 w-24 text-center"
                              aria-label={`Pemakaian ${item.material_name}`}
                            />
                          </div>
                          <p className="mt-1 text-right text-xs text-slate-500">
                            Estimasi HPP{" "}
                            {formatRupiah(
                              rupiah(
                                (Number(usageFor(item)) || 0) *
                                  item.average_unit_cost,
                              ),
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Transaksi dapat disimpan tanpa kemasan. Pilih ukuran paket
                      untuk memuat material standar.
                    </p>
                  )}

                  {extraRows.map((row) => {
                    const material = materialMap.get(row.packaging_material_id);
                    return (
                      <div
                        key={row.key}
                        className="mt-2 rounded-lg border border-slate-200 p-2"
                      >
                        <SelectField
                          name="extra_material_id"
                          defaultValue={row.packaging_material_id}
                          className="h-10 w-full bg-white"
                          placeholder="Pilih material"
                          onValueChange={(value) =>
                            updateExtraRow(row.key, {
                              packaging_material_id: value,
                            })
                          }
                        >
                          <option value="" disabled>
                            Pilih material
                          </option>
                          {materials.map((item) => (
                            <option key={item.id} value={item.id}>
                              {materialOptionLabel(item.name, item.usage_unit_name)}
                            </option>
                          ))}
                        </SelectField>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            name="extra_usage_qty"
                            type="number"
                            min="0"
                            step="0.0001"
                            required
                            value={row.extra_usage_qty}
                            onChange={(event) =>
                              updateExtraRow(row.key, {
                                extra_usage_qty: event.target.value,
                              })
                            }
                            className="h-10 w-24"
                            aria-label="Jumlah pemakaian material tambahan"
                          />
                          <p className="flex-1 text-xs text-slate-500">
                            {material
                              ? `Stok ${formatNumber(material.stock_qty, 4)} ${material.usage_unit_name}`
                              : "-"}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Hapus material tambahan"
                            onClick={() =>
                              setExtraRows((current) =>
                                current.filter((item) => item.key !== row.key),
                              )
                            }
                            className="text-rose-600"
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addExtraRow}
                    disabled={materials.length === 0}
                    className="mt-2 h-10 w-full"
                  >
                    Tambah Material Kemasan
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-teal-50 p-4 ring-1 ring-teal-100">
              <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                Total Tagihan
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-teal-900">
                {formatRupiah(totalRevenue)}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-teal-700">
                <span>{formatNumber(itemCount, 4)} item</span>
                <span>Diskon {formatRupiah(headerDiscount)}</span>
                <span>Tambahan {formatRupiah(fee)}</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={pending || rows.length === 0}
              className="mt-4 h-12 w-full rounded-xl bg-teal-600 text-base font-semibold text-white hover:bg-teal-700"
            >
              {pending ? "Menyimpan..." : "Simpan & Selesaikan Transaksi"}
            </Button>
            <p className="mt-2 text-center text-xs text-slate-500">
              HPP {formatRupiah(totalCogs)} · Laba kotor{" "}
              {formatRupiah(grossProfit)}
              {selectedChannel?.is_marketplace
                ? ` · Setelah admin ${formatRupiah(netGrossProfit)}`
                : ""}
            </p>
            <ActionMessage state={state} />
          </Panel>
        </aside>
      </div>
    </form>
  );
}
