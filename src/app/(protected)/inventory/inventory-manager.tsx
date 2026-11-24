"use client";

import {
  ActionMessage,
  SubmitButton,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
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
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-900/40"
      />
      <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-zinc-600">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            Tutup
          </button>
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
      <button
        type="button"
        className={primaryButtonClass}
        onClick={() => setOpen(true)}
      >
        Penyesuaian Stok
      </button>

      <ModalFrame
        open={open}
        onClose={() => setOpen(false)}
        title="Penyesuaian Stok (Stock Opname)"
        description="Selisih positif membuat batch baru; selisih negatif memotong batch FIFO tertua."
      >
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="variant_id" className="text-sm font-medium">
              Varian produk
            </label>
            <select
              id="variant_id"
              name="variant_id"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="">Pilih varian</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label} — stok {variant.stock_qty}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="direction" className="text-sm font-medium">
                Arah penyesuaian
              </label>
              <select
                id="direction"
                name="direction"
                required
                defaultValue="IN"
                className={inputClass}
              >
                <option value="IN">Tambah stok</option>
                <option value="OUT">Kurangi stok</option>
              </select>
            </div>
            <div>
              <label htmlFor="qty_change" className="text-sm font-medium">
                Jumlah
              </label>
              <input
                id="qty_change"
                name="qty_change"
                type="number"
                min="0.0001"
                step="0.0001"
                required
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label htmlFor="unit_cost" className="text-sm font-medium">
              HPP batch baru (Rp)
            </label>
            <input
              id="unit_cost"
              name="unit_cost"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Dipakai hanya untuk penambahan stok. Untuk pengurangan, HPP
              mengikuti batch FIFO.
            </p>
          </div>

          <div>
            <label htmlFor="reason" className="text-sm font-medium">
              Alasan penyesuaian
            </label>
            <input
              id="reason"
              name="reason"
              required
              maxLength={500}
              className={inputClass}
              placeholder="Contoh: Hasil hitung fisik"
            />
          </div>

          <ActionMessage state={state} />
          <div className="flex items-center gap-3">
            <SubmitButton pending={pending} className={primaryButtonClass}>
              Simpan Penyesuaian
            </SubmitButton>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={secondaryButtonClass}
            >
              Batal
            </button>
          </div>
        </form>
      </ModalFrame>
    </>
  );
}
