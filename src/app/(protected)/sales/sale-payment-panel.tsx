"use client";

import { useActionState } from "react";
import { ActionMessage, Label, SubmitButton } from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { markSalePaidAction, markSaleSettledAction } from "./actions";
import { SALE_PAYMENT_METHODS } from "./types";
import { VoidSaleButton } from "./void-sale-button";

export function SalePaymentPanel({
  saleId,
  orderStatus,
  paymentStatus,
  paymentMethod,
  settlementStatus,
  isStockDeducted,
}: {
  saleId: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  settlementStatus: string;
  isStockDeducted: boolean;
}) {
  const [paidState, paidAction, paidPending] = useActionState(
    markSalePaidAction,
    EMPTY_ACTION_STATE,
  );
  const [settledState, settledAction, settledPending] = useActionState(
    markSaleSettledAction,
    EMPTY_ACTION_STATE,
  );

  const canMarkPaid =
    orderStatus !== "Dibatalkan" && paymentStatus === "Belum_dibayar";
  const canMarkSettled =
    orderStatus !== "Dibatalkan" &&
    (settlementStatus === "Belum_cair" ||
      settlementStatus === "Sebagian_cair");
  const canVoid = orderStatus === "Selesai" && isStockDeducted;
  const initialMethod =
    SALE_PAYMENT_METHODS.find((method) => method === paymentMethod) ??
    SALE_PAYMENT_METHODS[0];

  if (!canMarkPaid && !canMarkSettled && !canVoid) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Tidak ada pembaruan status yang tersedia untuk transaksi ini.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {canMarkPaid ? (
        <form action={paidAction} className="space-y-2">
          <input type="hidden" name="id" value={saleId} />
          <Label
            htmlFor={`paid-method-${saleId}`}
            className="text-xs font-medium"
          >
            Metode pembayaran untuk pelunasan
          </Label>
          <SelectField
            name="payment_method"
            id={`paid-method-${saleId}`}
            defaultValue={initialMethod}
            className="h-10 w-full bg-white"
          >
            {SALE_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </SelectField>
          <SubmitButton pending={paidPending} className="h-9 rounded-lg px-3">
            Tandai Sudah Dibayar (Lunas)
          </SubmitButton>
          <ActionMessage state={paidState} />
        </form>
      ) : null}

      {canMarkSettled ? (
        <form action={settledAction} className="space-y-2">
          <input type="hidden" name="id" value={saleId} />
          <SubmitButton pending={settledPending} className="h-9 rounded-lg px-3">
            Tandai Sudah Dicairkan
          </SubmitButton>
          <ActionMessage state={settledState} />
        </form>
      ) : null}

      {canVoid ? <VoidSaleButton saleId={saleId} compact /> : null}
    </div>
  );
}
