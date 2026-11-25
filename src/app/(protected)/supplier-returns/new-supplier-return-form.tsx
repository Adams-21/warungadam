"use client";

import {
  ActionMessage,
  Button,
  Input,
  Label,
  SubmitButton,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { formatNumber, formatRupiah } from "@/lib/format";
import { useActionState, useState } from "react";
import { createSupplierReturnAction } from "./actions";
import type { SupplierReturnPurchaseView } from "./types";

type SupplierReturnRow = {
  key: string;
  goods_receipt_item_id: string;
  batch_id: string;
  variant_id: string;
  label: string;
  qty: string;
  max_qty: number;
  batch_remaining_qty: number;
  unit_price: number;
};

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewSupplierReturnForm({
  purchases,
  resolutions,
}: {
  purchases: SupplierReturnPurchaseView[];
  resolutions: string[];
}) {
  const [state, formAction, pending] = useActionState(
    createSupplierReturnAction,
    EMPTY_ACTION_STATE,
  );
  const [purchaseId, setPurchaseId] = useState("");
  const [rows, setRows] = useState<SupplierReturnRow[]>([]);
  const [resolutionType, setResolutionType] = useState(resolutions[0] ?? "");
  const [returnAmount, setReturnAmount] = useState("");

  const selectedPurchase = purchases.find((purchase) => purchase.id === purchaseId);
  const calculatedAmount = rows.reduce(
    (sum, row) => sum + Number(row.qty || 0) * row.unit_price,
    0,
  );
  const finalAmount = returnAmount === "" ? calculatedAmount : Number(returnAmount);

  function handlePurchaseChange(value: string) {
    setPurchaseId(value);
    const purchase = purchases.find((row) => row.id === value);
    setRows(
      purchase
        ? purchase.items.map((item) => ({
            key: item.id,
            goods_receipt_item_id: item.id,
            batch_id: item.batch_id,
            variant_id: item.variant_id,
            label: item.label,
            qty: "",
            max_qty: Math.min(item.available_qty, item.batch_remaining_qty),
            batch_remaining_qty: item.batch_remaining_qty,
            unit_price: item.unit_price,
          }))
        : [],
    );
  }

  function updateRow(key: string, qty: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, qty } : row)),
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <ActionMessage state={state} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="purchase_id" className="text-sm font-medium">
            Pembelian Asal
          </Label>
          <SelectField
            name="purchase_id"
            defaultValue={purchaseId}
            id="purchase_id"
            className="mt-1 h-10 w-full bg-white"
            onValueChange={(value) => handlePurchaseChange(value)}
            placeholder="Pilih pembelian"
          >
            <option value="">Pilih pembelian</option>
            {purchases.map((purchase) => (
              <option key={purchase.id} value={purchase.id}>
                {purchase.purchase_number} · {purchase.supplier_name}
              </option>
            ))}
          </SelectField>
          {selectedPurchase ? (
            <p className="mt-1 text-xs text-slate-500">
              Sisa tagihan {formatRupiah(selectedPurchase.remaining_amount)}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="return_date" className="text-sm font-medium">
            Tanggal Retur
          </Label>
          <Input
            id="return_date"
            name="return_date"
            type="date"
            required
            defaultValue={todayInput()}
            className="mt-1 h-10 bg-white"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="resolution_type" className="text-sm font-medium">
            Penyelesaian
          </Label>
          <SelectField
            name="resolution_type"
            defaultValue={resolutionType}
            id="resolution_type"
            className="mt-1 h-10 w-full bg-white"
            onValueChange={(value) => setResolutionType(value)}
          >
            {resolutions.map((resolution) => (
              <option key={resolution} value={resolution}>
                {resolution}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <Label htmlFor="settlement_date" className="text-sm font-medium">
            Tanggal Realisasi
          </Label>
          <Input
            id="settlement_date"
            name="settlement_date"
            type="date"
            required={resolutionType === "PENGEMBALIAN_UANG" && calculatedAmount > 0}
            className="mt-1 h-10 bg-white"
          />
          <p className="mt-1 text-xs text-slate-500">
            Wajib untuk pengembalian uang; opsional untuk potongan tagihan.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="reason" className="text-sm font-medium">
          Alasan Retur
        </Label>
        <textarea
          id="reason"
          name="reason"
          required
          maxLength={500}
          rows={3}
          className={inputClass}
          placeholder="Contoh: Barang tidak sesuai pesanan"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Barang Diretur</h3>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Pilih pembelian asal untuk menampilkan barang yang dapat diretur.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.key}
                className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[2fr_1fr_1fr]"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{row.label}</p>
                  <input type="hidden" name="goods_receipt_item_id" value={row.goods_receipt_item_id} />
                  <input type="hidden" name="batch_id" value={row.batch_id} />
                  <input type="hidden" name="variant_id" value={row.variant_id} />
                  <p className="text-xs text-slate-500">
                    Maks. {formatNumber(row.max_qty)} · Harga {formatRupiah(row.unit_price)}
                  </p>
                </div>
                <div>
                  <Label htmlFor={`qty-${index}`} className="text-xs font-medium text-slate-600">
                    Jumlah
                  </Label>
                  <Input
                    id={`qty-${index}`}
                    name="qty"
                    type="number"
                    min="0"
                    step="1"
                    max={row.max_qty}
                    value={row.qty}
                    onChange={(event) => updateRow(row.key, event.target.value)}
                    className="mt-1 h-10 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor={`unit-price-${index}`} className="text-xs font-medium text-slate-600">
                    Harga Satuan
                  </Label>
                  <Input
                    id={`unit-price-${index}`}
                    name="unit_price"
                    type="number"
                    min="0"
                    step="1"
                    value={row.unit_price}
                    readOnly
                    className="mt-1 h-10 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 rounded-md bg-slate-50 p-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-slate-600">
            Nilai otomatis:{" "}
            <strong className="text-slate-900">{formatRupiah(calculatedAmount)}</strong>
          </p>
          <p className="text-xs text-slate-500">Boleh disesuaikan sebelum disimpan.</p>
        </div>
        <div>
          <Label htmlFor="return_amount" className="text-sm font-medium">
            Nominal Retur Final
          </Label>
          <Input
            id="return_amount"
            name="return_amount"
            type="number"
            min="0"
            step="1"
            value={returnAmount}
            onChange={(event) => setReturnAmount(event.target.value)}
            placeholder={String(calculatedAmount)}
            className="mt-1 h-10 bg-white"
          />
        </div>
      </div>

      <p className="text-sm text-slate-700">
        Total final: <strong>{formatRupiah(finalAmount)}</strong>
      </p>

      <div className="flex flex-wrap gap-3">
        <SubmitButton pending={pending}>Simpan Retur Supplier</SubmitButton>
        <Button
          type="button"
          onClick={() => setReturnAmount(String(calculatedAmount))}
          className={secondaryButtonClass}
        >
          Pakai Nilai Otomatis
        </Button>
      </div>
    </form>
  );
}
