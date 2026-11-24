"use client";

import {
  ActionMessage,
  SubmitButton,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { formatNumber, formatRupiah } from "@/lib/format";
import { useActionState, useState } from "react";
import { createCustomerReturnAction } from "../actions";
import type { CustomerReturnSaleView, CustomerReturnVariantView } from "../types";

type ReturnRow = {
  key: string;
  sale_item_id: string;
  variant_id: string;
  qty: string;
  condition: string;
  unit_cost: string;
};

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewCustomerReturnForm({
  sales,
  variants,
}: {
  sales: CustomerReturnSaleView[];
  variants: CustomerReturnVariantView[];
}) {
  const [state, formAction, pending] = useActionState(
    createCustomerReturnAction,
    EMPTY_ACTION_STATE,
  );
  const [saleId, setSaleId] = useState("");
  const [rows, setRows] = useState<ReturnRow[]>([]);

  const selectedSale = sales.find((sale) => sale.id === saleId);

  function handleSaleChange(value: string) {
    setSaleId(value);
    const sale = sales.find((row) => row.id === value);
    setRows(
      sale
        ? sale.items.map((item) => ({
            key: item.id,
            sale_item_id: item.id,
            variant_id: item.variant_id,
            qty: "",
            condition: "Layak_jual",
            unit_cost: String(item.unit_cost),
          }))
        : [],
    );
  }

  function addBlankRow() {
    setRows((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        sale_item_id: "",
        variant_id: "",
        qty: "",
        condition: "Layak_jual",
        unit_cost: "0",
      },
    ]);
  }

  function updateRow(key: string, patch: Partial<ReturnRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  const estimatedRefund = rows.reduce((sum, row) => {
    const item = selectedSale?.items.find((saleItem) => saleItem.id === row.sale_item_id);
    return sum + Number(row.qty || 0) * (item?.unit_selling_price ?? 0);
  }, 0);

  return (
    <form action={formAction} className="space-y-5">
      <ActionMessage state={state} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="return_date" className="text-sm font-medium">
            Tanggal Retur
          </label>
          <input
            id="return_date"
            name="return_date"
            type="date"
            required
            defaultValue={todayInput()}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="original_sale_id" className="text-sm font-medium">
            Transaksi Penjualan Asal
          </label>
          <select
            id="original_sale_id"
            name="original_sale_id"
            value={saleId}
            onChange={(event) => handleSaleChange(event.target.value)}
            className={inputClass}
          >
            <option value="">Tanpa transaksi asal</option>
            {sales.map((sale) => (
              <option key={sale.id} value={sale.id}>
                {sale.transaction_number} · {new Date(sale.transaction_date).toLocaleDateString("id-ID")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="reason" className="text-sm font-medium">
          Alasan Retur
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          maxLength={500}
          rows={3}
          className={inputClass}
          placeholder="Contoh: Barang salah kirim / cepat rusak"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-800">Barang Retur</h3>
          <button type="button" onClick={addBlankRow} className={secondaryButtonClass}>
            Tambah Barang
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
            Pilih transaksi asal atau tambah barang tanpa referensi.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
              const saleItem = selectedSale?.items.find(
                (item) => item.id === row.sale_item_id,
              );
              return (
                <div
                  key={row.key}
                  className="grid gap-3 rounded-md border border-zinc-200 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                >
                  <div>
                    <label className="text-xs font-medium text-zinc-600">
                      Varian Barang
                    </label>
                    {saleItem ? (
                      <>
                        <input type="hidden" name="sale_item_id" value={row.sale_item_id} />
                        <input type="hidden" name="variant_id" value={row.variant_id} />
                        <p className="mt-1 text-sm text-zinc-800">{saleItem.variant_label}</p>
                        <p className="text-xs text-zinc-500">
                          Maks. {formatNumber(saleItem.available_qty)} · HPP{" "}
                          {formatRupiah(row.unit_cost === "" ? 0 : Number(row.unit_cost))}
                        </p>
                      </>
                    ) : (
                      <>
                        <input type="hidden" name="sale_item_id" value="" />
                        <select
                          value={row.variant_id}
                          onChange={(event) => {
                            const variant = variants.find(
                              (item) => item.id === event.target.value,
                            );
                            updateRow(row.key, {
                              variant_id: event.target.value,
                              unit_cost: String(variant?.latest_unit_cost ?? 0),
                            });
                          }}
                          required
                          className={`${inputClass} mt-1`}
                        >
                          <option value="">Pilih varian</option>
                          {variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.label}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`qty-${index}`} className="text-xs font-medium text-zinc-600">
                      Jumlah
                    </label>
                    <input
                      id={`qty-${index}`}
                      name="qty"
                      type="number"
                      min="0"
                      step="1"
                      max={saleItem ? saleItem.available_qty : undefined}
                      value={row.qty}
                      onChange={(event) => updateRow(row.key, { qty: event.target.value })}
                      required
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`condition-${index}`} className="text-xs font-medium text-zinc-600">
                      Kondisi
                    </label>
                    <select
                      id={`condition-${index}`}
                      name="condition"
                      value={row.condition}
                      onChange={(event) =>
                        updateRow(row.key, { condition: event.target.value })
                      }
                      className={`${inputClass} mt-1`}
                    >
                      <option value="Layak_jual">Layak Jual</option>
                      <option value="Rusak">Rusak</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`cost-${index}`} className="text-xs font-medium text-zinc-600">
                      HPP Baru
                    </label>
                    <input
                      id={`cost-${index}`}
                      name="unit_cost"
                      type="number"
                      min="0"
                      step="1"
                      value={row.unit_cost}
                      onChange={(event) =>
                        updateRow(row.key, { unit_cost: event.target.value })
                      }
                      readOnly={Boolean(saleItem)}
                      className={`${inputClass} mt-1`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className={`${secondaryButtonClass} self-end`}
                  >
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-md bg-zinc-50 p-4">
        <p className="text-sm text-zinc-600">
          Estimasi dana retur sebelum diskon transaksi:{" "}
          <strong className="text-zinc-900">{formatRupiah(estimatedRefund)}</strong>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          HPP input hanya dipakai untuk retur tanpa transaksi asal.
        </p>
      </div>

      <SubmitButton pending={pending}>Simpan Retur</SubmitButton>
    </form>
  );
}
