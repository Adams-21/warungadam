"use client";

import { useActionState } from "react";
import { ActionMessage, Input, Label, SubmitButton } from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { formatRupiah } from "@/lib/format";
import { recordSupplierPaymentAction } from "./actions";

export function SupplierPaymentForm({
  purchaseId,
  remainingAmount,
  today,
}: {
  purchaseId: string;
  remainingAmount: number;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    recordSupplierPaymentAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="purchase_id" value={purchaseId} />
      <div>
        <Label htmlFor="payment_date" className="text-sm font-medium">
          Tanggal pembayaran
        </Label>
        <Input
          id="payment_date"
          name="payment_date"
          type="date"
          required
          defaultValue={today}
          className="mt-1 h-10 bg-white"
        />
      </div>
      <div>
        <Label htmlFor="payment_amount" className="text-sm font-medium">
          Nominal
        </Label>
        <Input
          id="payment_amount"
          name="amount"
          type="number"
          min="1"
          max={remainingAmount}
          step="1"
          required
          placeholder={String(remainingAmount)}
          className="mt-1 h-10 bg-white"
        />
        <p className="mt-1 text-xs text-slate-500">
          Maksimal {formatRupiah(remainingAmount)}
        </p>
      </div>
      <div>
        <Label htmlFor="payment_method" className="text-sm font-medium">
          Metode pembayaran
        </Label>
        <Input
          id="payment_method"
          name="payment_method"
          required
          maxLength={100}
          placeholder="Contoh: Transfer BCA"
          className="mt-1 h-10 bg-white"
        />
      </div>
      <ActionMessage state={state} />
      <SubmitButton pending={pending}>Simpan Pembayaran</SubmitButton>
    </form>
  );
}
