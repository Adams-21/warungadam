"use client";

import { useActionState, useRef, useState } from "react";
import {
  ActionMessage,
  SubmitButton,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { formatRupiah } from "@/lib/format";
import { createPurchaseAction } from "../actions";
import type { SupplierOptionView, VariantOptionView } from "../types";

type ItemRow = {
  key: number;
  variant_id: string;
  ordered_qty: string;
  unit_price: string;
};

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

export function NewPurchaseForm({
  suppliers,
  variants,
  today,
}: {
  suppliers: SupplierOptionView[];
  variants: VariantOptionView[];
  today: string;
}) {
  const nextKey = useRef(1);
  const [paymentType, setPaymentType] = useState("TUNAI");
  const [rows, setRows] = useState<ItemRow[]>([
    { key: 0, variant_id: "", ordered_qty: "", unit_price: "" },
  ]);
  const [state, formAction, pending] = useActionState(
    createPurchaseAction,
    EMPTY_ACTION_STATE,
  );

  function updateRow(key: number, patch: Partial<ItemRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        key: nextKey.current++,
        variant_id: "",
        ordered_qty: "",
        unit_price: "",
      },
    ]);
  }

  function removeRow(key: number) {
    setRows((current) =>
      current.length === 1 ? current : current.filter((row) => row.key !== key),
    );
  }

  const estimatedTotal = rows.reduce((total, row) => {
    const qty = Number(row.ordered_qty);
    const price = Number(row.unit_price);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return total;
    return total + qty * price;
  }, 0);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="supplier_id" className="text-sm font-medium">
            Supplier
          </label>
          <select
            id="supplier_id"
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
          <label htmlFor="purchase_date" className="text-sm font-medium">
            Tanggal pembelian
          </label>
          <input
            id="purchase_date"
            name="purchase_date"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="payment_type" className="text-sm font-medium">
            Tipe pembayaran
          </label>
          <select
            id="payment_type"
            name="payment_type"
            required
            value={paymentType}
            onChange={(event) => setPaymentType(event.target.value)}
            className={inputClass}
          >
            <option value="TUNAI">Tunai</option>
            <option value="TEMPO">Tempo</option>
          </select>
        </div>
        <div>
          <label htmlFor="due_date" className="text-sm font-medium">
            Jatuh tempo
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            disabled={paymentType !== "TEMPO"}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium">
          Catatan
        </label>
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thClass}>Varian Produk</th>
              <th className={thClass}>Jumlah</th>
              <th className={thClass}>Satuan</th>
              <th className={thClass}>Harga Satuan</th>
              <th className={thClass}>Subtotal</th>
              <th className={thClass}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => {
              const variant = variants.find((item) => item.id === row.variant_id);
              const qty = Number(row.ordered_qty);
              const price = Number(row.unit_price);
              const subtotal =
                Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;

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
                      name="ordered_qty"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      required
                      value={row.ordered_qty}
                      onChange={(event) =>
                        updateRow(row.key, { ordered_qty: event.target.value })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className={tdClass}>{variant?.unit_name ?? "-"}</td>
                  <td className={tdClass}>
                    <input
                      name="unit_price"
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={row.unit_price}
                      onChange={(event) =>
                        updateRow(row.key, { unit_price: event.target.value })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className={tdClass}>{formatRupiah(Math.round(subtotal))}</td>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={addRow} className={secondaryButtonClass}>
            Tambah Item
          </button>
          <span className="text-sm font-medium">
            Total: {formatRupiah(Math.round(estimatedTotal))}
          </span>
        </div>
        <SubmitButton pending={pending}>Simpan Pesanan</SubmitButton>
      </div>

      <ActionMessage state={state} />
    </form>
  );
}
