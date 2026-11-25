"use client";

import {
  ActionMessage,
  Button,
  Input,
  Label,
  SubmitButton,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { useActionState, useState, type ReactNode } from "react";
import { adjustStockAction } from "./actions";
import type { InventoryAdjustmentOption } from "./types";

function ModalFrame({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      <Button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40"
      />
      <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <Button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            Tutup
          </Button>
        </div>
        <div className="mt-6">{children}</div>
      </aside>
    </div>
  );
}

export function StockAdjustmentModal({
  variants,
}: {
  variants: InventoryAdjustmentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    adjustStockAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <>
      <Button
        type="button"
        className={primaryButtonClass}
        onClick={() => setOpen(true)}
      >
        Penyesuaian Stok
      </Button>

      <ModalFrame
        open={open}
        onClose={() => setOpen(false)}
        title="Penyesuaian Stok (Stock Opname)"
        description="Selisih positif membuat batch baru; selisih negatif memotong batch FIFO tertua."
      >
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="variant_id" className="text-sm font-medium">
              Varian produk
            </Label>
            <SelectField
              name="variant_id"
              defaultValue=""
              id="variant_id"
              className="mt-1 h-10 w-full bg-white"
              placeholder="Pilih varian"
            >
              <option value="">Pilih varian</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label} — stok {variant.stock_qty}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="direction" className="text-sm font-medium">
                Arah penyesuaian
              </Label>
              <SelectField
                name="direction"
                defaultValue="IN"
                id="direction"
                className="mt-1 h-10 w-full bg-white"
              >
                <option value="IN">Tambah stok</option>
                <option value="OUT">Kurangi stok</option>
              </SelectField>
            </div>
            <div>
              <Label htmlFor="qty_change" className="text-sm font-medium">
                Jumlah
              </Label>
              <Input
                id="qty_change"
                name="qty_change"
                type="number"
                min="0.0001"
                step="0.0001"
                required
                className="mt-1 h-10 bg-white"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="unit_cost" className="text-sm font-medium">
              HPP batch baru (Rp)
            </Label>
            <Input
              id="unit_cost"
              name="unit_cost"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              className="mt-1 h-10 bg-white"
            />
            <p className="mt-1 text-xs text-slate-500">
              Dipakai hanya untuk penambahan stok. Untuk pengurangan, HPP
              mengikuti batch FIFO.
            </p>
          </div>

          <div>
            <Label htmlFor="reason" className="text-sm font-medium">
              Alasan penyesuaian
            </Label>
            <Input
              id="reason"
              name="reason"
              required
              maxLength={500}
              className="mt-1 h-10 bg-white"
              placeholder="Contoh: Hasil hitung fisik"
            />
          </div>

          <ActionMessage state={state} />
          <div className="flex items-center gap-3">
            <SubmitButton pending={pending} className={primaryButtonClass}>
              Simpan Penyesuaian
            </SubmitButton>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className={secondaryButtonClass}
            >
              Batal
            </Button>
          </div>
        </form>
      </ModalFrame>
    </>
  );
}
