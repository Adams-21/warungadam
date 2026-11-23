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
import { createPackagingPurchaseAction } from "./actions";
import type { PackagingMaterialOptionView } from "../types";

type ItemRow = {
  key: number;
  packaging_material_id: string;
  purchase_qty: string;
  unit_price: string;
};

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

export function PackagingPurchaseForm({
  materials,
  today,
}: {
  materials: PackagingMaterialOptionView[];
  today: string;
}) {
  const nextKey = useRef(1);
  const [rows, setRows] = useState<ItemRow[]>([
    {
      key: 0,
      packaging_material_id: "",
      purchase_qty: "",
      unit_price: "",
    },
  ]);
  const [state, formAction, pending] = useActionState(
    createPackagingPurchaseAction,
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
        packaging_material_id: "",
        purchase_qty: "",
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
    const qty = Number(row.purchase_qty);
    const price = Number(row.unit_price);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return total;
    return total + qty * price;
  }, 0);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="packaging_purchase_date" className="text-sm font-medium">
            Tanggal pembelian
          </label>
          <input
            id="packaging_purchase_date"
            name="purchase_date"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="packaging_notes" className="text-sm font-medium">
            Catatan
          </label>
          <input
            id="packaging_notes"
            name="notes"
            className={inputClass}
            placeholder="Opsional"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thClass}>Material</th>
              <th className={thClass}>Jumlah Beli</th>
              <th className={thClass}>Satuan Beli</th>
              <th className={thClass}>Harga Satuan</th>
              <th className={thClass}>Konversi</th>
              <th className={thClass}>Subtotal</th>
              <th className={thClass}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => {
              const material = materials.find(
                (item) => item.id === row.packaging_material_id,
              );
              const qty = Number(row.purchase_qty);
              const price = Number(row.unit_price);
              const subtotal =
                Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;

              return (
                <tr key={row.key}>
                  <td className={tdClass}>
                    <select
                      name="packaging_material_id"
                      required
                      value={row.packaging_material_id}
                      onChange={(event) =>
                        updateRow(row.key, {
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
                      name="purchase_qty"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      required
                      value={row.purchase_qty}
                      onChange={(event) =>
                        updateRow(row.key, { purchase_qty: event.target.value })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className={tdClass}>
                    {material?.purchase_unit_name ?? "-"}
                  </td>
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
                  <td className={tdClass}>
                    {material
                      ? `${formatNumber(material.conversion_factor, 4)} ${material.usage_unit_name}`
                      : "-"}
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
            Tambah Material
          </button>
          <span className="text-sm font-medium">
            Total: {formatRupiah(Math.round(estimatedTotal))}
          </span>
        </div>
        <SubmitButton pending={pending}>Simpan Pembelian</SubmitButton>
      </div>

      <ActionMessage state={state} />
    </form>
  );
}
