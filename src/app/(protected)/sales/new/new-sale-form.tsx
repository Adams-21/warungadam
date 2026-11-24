"use client";

import { useActionState, useRef, useState } from "react";
import {
  ActionMessage,
  SubmitButton,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { formatNumber, formatRupiah } from "@/lib/format";
import { createSaleAction } from "../actions";
import type {
  SaleChannelOptionView,
  SalePackagingMaterialView,
  SalePackageSizeView,
  SaleVariantOptionView,
} from "../types";

type ItemRow = {
  key: number;
  variant_id: string;
  qty: string;
  unit_selling_price: string;
  item_discount: string;
};

type ExtraMaterialRow = {
  key: number;
  packaging_material_id: string;
  extra_usage_qty: string;
};

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

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
  const [channelId, setChannelId] = useState("");
  const [packageSizeId, setPackageSizeId] = useState("");
  const [packageCount, setPackageCount] = useState("1");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [additionalFee, setAdditionalFee] = useState("0");
  const [rows, setRows] = useState<ItemRow[]>([
    {
      key: 0,
      variant_id: "",
      qty: "1",
      unit_selling_price: "",
      item_discount: "0",
    },
  ]);
  const [extraRows, setExtraRows] = useState<ExtraMaterialRow[]>([]);
  const [usageOverrides, setUsageOverrides] = useState<Record<string, string>>(
    {},
  );
  const [state, formAction, pending] = useActionState(
    createSaleAction,
    EMPTY_ACTION_STATE,
  );

  const selectedChannel = channels.find((channel) => channel.id === channelId);
  const selectedSize = packageSizes.find((size) => size.id === packageSizeId);
  const materialMap = new Map(materials.map((material) => [material.id, material]));

  function usageFor(item: SalePackageSizeView["items"][number]): string {
    const override = usageOverrides[item.packaging_material_id];
    if (override !== undefined) return override;
    return String(item.default_usage_qty * (Number(packageCount) || 0));
  }

  function priceForVariant(variantId: string, selectedChannelId = channelId) {
    const variant = variants.find((item) => item.id === variantId);
    if (!variant) return "";
    return String(
      variant.channel_prices[selectedChannelId] ?? variant.default_selling_price,
    );
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

  function addRow() {
    setRows((current) => [
      ...current,
      {
        key: nextItemKey.current++,
        variant_id: "",
        qty: "1",
        unit_selling_price: "",
        item_discount: "0",
      },
    ]);
  }

  function removeRow(key: number) {
    setRows((current) =>
      current.length === 1 ? current : current.filter((row) => row.key !== key),
    );
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
    const variant = variants.find((item) => item.id === row.variant_id);
    return sum + rupiah((Number(row.qty) || 0) * (variant?.cost_hint ?? 0));
  }, 0);

  const standardPackagingCogs = (selectedSize?.items ?? []).reduce(
    (sum, item) =>
      sum +
      rupiah(
        (Number(usageFor(item)) || 0) * item.average_unit_cost,
      ),
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

  const summaryClass = "rounded-lg border border-zinc-200 bg-zinc-50 p-3";

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="sales_channel_id" className="text-sm font-medium">
            Kanal penjualan
          </label>
          <select
            id="sales_channel_id"
            name="sales_channel_id"
            required
            value={channelId}
            onChange={(event) => handleChannelChange(event.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Pilih kanal
            </option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
                {channel.is_marketplace ? " (marketplace)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="transaction_date" className="text-sm font-medium">
            Tanggal transaksi
          </label>
          <input
            id="transaction_date"
            name="transaction_date"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="external_order_number" className="text-sm font-medium">
            No. order/resi eksternal
          </label>
          <input
            id="external_order_number"
            name="external_order_number"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="package_size_id" className="text-sm font-medium">
            Ukuran paket kemasan
          </label>
          <select
            id="package_size_id"
            name="package_size_id"
            value={packageSizeId}
            onChange={(event) => {
              setPackageSizeId(event.target.value);
              setUsageOverrides({});
            }}
            className={inputClass}
          >
            <option value="">Tanpa kemasan standar</option>
            {packageSizes.map((size) => (
              <option key={size.id} value={size.id}>
                {size.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="package_count" className="text-sm font-medium">
            Jumlah paket
          </label>
          <input
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
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="discount_amount" className="text-sm font-medium">
            Diskon transaksi
          </label>
          <input
            id="discount_amount"
            name="discount_amount"
            type="number"
            min="0"
            step="1"
            value={discountAmount}
            onChange={(event) => setDiscountAmount(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="additional_fee_amount" className="text-sm font-medium">
            Biaya tambahan pelanggan
          </label>
          <input
            id="additional_fee_amount"
            name="additional_fee_amount"
            type="number"
            min="0"
            step="1"
            value={additionalFee}
            onChange={(event) => setAdditionalFee(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Item Penjualan</h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className={thClass}>Varian</th>
                <th className={thClass}>Jumlah</th>
                <th className={thClass}>Stok</th>
                <th className={thClass}>Harga Jual</th>
                <th className={thClass}>Diskon Item</th>
                <th className={thClass}>Subtotal</th>
                <th className={thClass}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => {
                const variant = variants.find(
                  (item) => item.id === row.variant_id,
                );
                const subtotal = Math.max(
                  0,
                  rupiah(
                    (Number(row.qty) || 0) *
                      (Number(row.unit_selling_price) || 0),
                  ) - Math.max(0, Number(row.item_discount) || 0),
                );

                return (
                  <tr key={row.key}>
                    <td className={tdClass}>
                      <select
                        name="variant_id"
                        required
                        value={row.variant_id}
                        onChange={(event) =>
                          updateRow(row.key, { variant_id: event.target.value })
                        }
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Pilih varian
                        </option>
                        {variants.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={tdClass}>
                      <input
                        name="qty"
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        max={variant?.stock_qty}
                        required
                        value={row.qty}
                        onChange={(event) =>
                          updateRow(row.key, { qty: event.target.value })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className={tdClass}>
                      {variant
                        ? `${formatNumber(variant.stock_qty, 4)} ${variant.unit_name}`
                        : "-"}
                    </td>
                    <td className={tdClass}>
                      <input
                        name="unit_price"
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={row.unit_selling_price}
                        onChange={(event) =>
                          updateRow(row.key, {
                            unit_selling_price: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className={tdClass}>
                      <input
                        name="item_discount"
                        type="number"
                        min="0"
                        step="1"
                        value={row.item_discount}
                        onChange={(event) =>
                          updateRow(row.key, {
                            item_discount: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </td>
                    <td className={tdClass}>{formatRupiah(subtotal)}</td>
                    <td className={tdClass}>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="text-sm font-medium text-red-700 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <button type="button" onClick={addRow} className={secondaryButtonClass}>
            Tambah Item
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Pemakaian Kemasan</h3>
        {selectedSize ? (
          <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={thClass}>Material</th>
                  <th className={thClass}>Takaran Standar / Paket</th>
                  <th className={thClass}>Pakai Aktual</th>
                  <th className={thClass}>Satuan</th>
                  <th className={thClass}>Stok</th>
                  <th className={thClass}>Estimasi HPP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {selectedSize.items.map((item) => (
                  <tr key={item.packaging_material_id}>
                    <input
                      type="hidden"
                      name="packaging_material_id"
                      value={item.packaging_material_id}
                    />
                    <td className={`${tdClass} font-medium`}>
                      {item.material_name}
                    </td>
                    <td className={tdClass}>
                      {formatNumber(item.default_usage_qty, 4)}
                    </td>
                    <td className={tdClass}>
                      <input
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
                        className={inputClass}
                      />
                    </td>
                    <td className={tdClass}>{item.usage_unit_name}</td>
                    <td className={tdClass}>
                      {formatNumber(item.stock_qty, 4)}
                    </td>
                    <td className={tdClass}>
                      {formatRupiah(
                        rupiah(
                          (Number(usageFor(item)) || 0) *
                            item.average_unit_cost,
                        ),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Transaksi dapat disimpan tanpa kemasan. Pilih ukuran paket untuk
            memuat material standar.
          </p>
        )}

        {extraRows.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={thClass}>Material Tambahan</th>
                  <th className={thClass}>Jumlah Pakai</th>
                  <th className={thClass}>Stok</th>
                  <th className={thClass}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {extraRows.map((row) => {
                  const material = materialMap.get(row.packaging_material_id);
                  return (
                    <tr key={row.key}>
                      <td className={tdClass}>
                        <select
                          name="extra_material_id"
                          required
                          value={row.packaging_material_id}
                          onChange={(event) =>
                            updateExtraRow(row.key, {
                              packaging_material_id: event.target.value,
                            })
                          }
                          className={inputClass}
                        >
                          <option value="" disabled>
                            Pilih material
                          </option>
                          {materials.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={tdClass}>
                        <input
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
                          className={inputClass}
                        />
                      </td>
                      <td className={tdClass}>
                        {material
                          ? `${formatNumber(material.stock_qty, 4)} ${material.usage_unit_name}`
                          : "-"}
                      </td>
                      <td className={tdClass}>
                        <button
                          type="button"
                          onClick={() =>
                            setExtraRows((current) =>
                              current.filter((item) => item.key !== row.key),
                            )
                          }
                          className="text-sm font-medium text-red-700 hover:underline"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-2">
          <button
            type="button"
            onClick={addExtraRow}
            disabled={materials.length === 0}
            className={secondaryButtonClass}
          >
            Tambah Material Kemasan
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={summaryClass}>
          <p className="text-xs font-medium uppercase text-zinc-500">
            Total Transaksi
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {formatRupiah(totalRevenue)}
          </p>
        </div>
        <div className={summaryClass}>
          <p className="text-xs font-medium uppercase text-zinc-500">
            HPP Produk
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {formatRupiah(productCogs)}
          </p>
        </div>
        <div className={summaryClass}>
          <p className="text-xs font-medium uppercase text-zinc-500">
            HPP Kemasan
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {formatRupiah(packagingCogs)}
          </p>
        </div>
        <div className={summaryClass}>
          <p className="text-xs font-medium uppercase text-zinc-500">
            Laba Kotor
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {formatRupiah(grossProfit)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Setelah estimasi admin: {formatRupiah(netGrossProfit)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          Estimasi biaya admin: {formatRupiah(adminFee)}
        </p>
        <SubmitButton pending={pending}>Simpan Penjualan</SubmitButton>
      </div>

      <ActionMessage state={state} />
    </form>
  );
}
