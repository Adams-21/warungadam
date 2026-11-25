"use client";

import { useActionState, useRef, useState } from "react";
import {
  ActionMessage,
  Button,
  Input,
  Label,
  SubmitButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  secondaryButtonClass,
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { formatNumber, formatRupiah } from "@/lib/format";
import { materialOptionLabel } from "@/lib/option-labels";
import { createPackagingPurchaseAction } from "./actions";
import type { PackagingMaterialOptionView } from "../types";

type ItemRow = {
  key: number;
  packaging_material_id: string;
  purchase_qty: string;
  unit_price: string;
};

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
          <Label htmlFor="packaging_purchase_date" className="text-sm font-medium">
            Tanggal pembelian
          </Label>
          <Input
            id="packaging_purchase_date"
            name="purchase_date"
            type="date"
            required
            defaultValue={today}
            className="mt-1 h-10 bg-white"
          />
        </div>
        <div>
          <Label htmlFor="packaging_notes" className="text-sm font-medium">
            Catatan
          </Label>
          <Input
            id="packaging_notes"
            name="notes"
            className="mt-1 h-10 bg-white"
            placeholder="Opsional"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-teal-50/40">
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Material</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah Beli</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Satuan Beli</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Harga Satuan</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Konversi</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const material = materials.find(
                (item) => item.id === row.packaging_material_id,
              );
              const qty = Number(row.purchase_qty);
              const price = Number(row.unit_price);
              const subtotal =
                Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;

              return (
                <TableRow key={row.key} className="hover:bg-teal-50/40">
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <SelectField
                      name="packaging_material_id"
                      defaultValue={row.packaging_material_id}
                      className="mt-1 h-10 w-full bg-white"
                      placeholder="Pilih material"
                      onValueChange={(value) =>
                        updateRow(row.key, {
                          packaging_material_id: value,
                        })
                      }
                    >
                      <option value="" disabled>
                        Pilih material
                      </option>
                      {materials.map((item) => (
                        <option key={item.id} value={item.id}>
                          {materialOptionLabel(item.name, item.purchase_unit_name)}
                        </option>
                      ))}
                    </SelectField>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <Input
                      name="purchase_qty"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      required
                      value={row.purchase_qty}
                      onChange={(event) =>
                        updateRow(row.key, { purchase_qty: event.target.value })
                      }
                      className="mt-1 h-10 bg-white"
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {material?.purchase_unit_name ?? "-"}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <Input
                      name="unit_price"
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={row.unit_price}
                      onChange={(event) =>
                        updateRow(row.key, { unit_price: event.target.value })
                      }
                      className="mt-1 h-10 bg-white"
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {material
                      ? `${formatNumber(material.conversion_factor, 4)} ${material.usage_unit_name}`
                      : "-"}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{formatRupiah(Math.round(subtotal))}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <Button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="text-sm font-medium text-rose-700 hover:underline"
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" onClick={addRow} className={secondaryButtonClass}>
            Tambah Material
          </Button>
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
