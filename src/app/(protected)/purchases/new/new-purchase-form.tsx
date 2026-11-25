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
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
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
          <Label htmlFor="supplier_id" className="text-sm font-medium">
            Supplier
          </Label>
          <SelectField
            name="supplier_id"
            defaultValue=""
            id="supplier_id"
            className="mt-1 h-10 w-full bg-white"
            placeholder="Pilih supplier"
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
          <Label htmlFor="purchase_date" className="text-sm font-medium">
            Tanggal pembelian
          </Label>
          <Input
            id="purchase_date"
            name="purchase_date"
            type="date"
            required
            defaultValue={today}
            className="mt-1 h-10 bg-white"
          />
        </div>
        <div>
          <Label htmlFor="payment_type" className="text-sm font-medium">
            Tipe pembayaran
          </Label>
          <SelectField
            name="payment_type"
            defaultValue={paymentType}
            id="payment_type"
            className="mt-1 h-10 w-full bg-white"
            onValueChange={setPaymentType}
          >
            <option value="TUNAI">Tunai</option>
            <option value="TEMPO">Tempo</option>
          </SelectField>
        </div>
        <div>
          <Label htmlFor="due_date" className="text-sm font-medium">
            Jatuh tempo
          </Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            required={paymentType === "TEMPO"}
            disabled={paymentType !== "TEMPO"}
            className="mt-1 h-10 bg-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes" className="text-sm font-medium">
          Catatan
        </Label>
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-teal-50/40">
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Varian Produk</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Satuan</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Harga Satuan</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const variant = variants.find((item) => item.id === row.variant_id);
              const qty = Number(row.ordered_qty);
              const price = Number(row.unit_price);
              const subtotal =
                Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;

              return (
                <TableRow key={row.key} className="hover:bg-teal-50/40">
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <SelectField
                      name="variant_id"
                      defaultValue={row.variant_id}
                      className="mt-1 h-10 w-full bg-white"
                      placeholder="Pilih varian"
                      onValueChange={(value) =>
                        updateRow(row.key, { variant_id: value })
                      }
                    >
                      <option value="" disabled>
                        Pilih varian
                      </option>
                      {variants.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </SelectField>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <Input
                      name="ordered_qty"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      required
                      value={row.ordered_qty}
                      onChange={(event) =>
                        updateRow(row.key, { ordered_qty: event.target.value })
                      }
                      className="mt-1 h-10 bg-white"
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{variant?.unit_name ?? "-"}</TableCell>
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
            Tambah Item
          </Button>
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
