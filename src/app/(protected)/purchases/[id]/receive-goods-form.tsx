"use client";

import { useActionState } from "react";
import {
  ActionMessage,
  SubmitButton,
  inputClass,
} from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { formatNumber } from "@/lib/format";
import { receiveGoodsAction } from "./actions";
import type { PurchaseItemView } from "../types";

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

export function ReceiveGoodsForm({
  items,
  purchaseId,
  today,
}: {
  items: PurchaseItemView[];
  purchaseId: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    receiveGoodsAction,
    EMPTY_ACTION_STATE,
  );
  const receivableItems = items.filter((item) => item.remaining_qty > 0);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="purchase_id" value={purchaseId} />
      <div>
        <label htmlFor="received_at" className="text-sm font-medium">
          Tanggal diterima
        </label>
        <input
          id="received_at"
          name="received_at"
          type="date"
          required
          defaultValue={today}
          className={inputClass}
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thClass}>Varian</th>
              <th className={thClass}>Sisa</th>
              <th className={thClass}>Jumlah Diterima</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {receivableItems.map((item) => (
              <tr key={item.id}>
                <td className={tdClass}>{item.variant_label}</td>
                <td className={tdClass}>
                  {formatNumber(item.remaining_qty, 4)} {item.unit_name}
                </td>
                <td className={tdClass}>
                  <input type="hidden" name="purchase_item_id" value={item.id} />
                  <input
                    name="received_qty"
                    type="number"
                    min="0"
                    max={item.remaining_qty}
                    step="0.0001"
                    defaultValue="0"
                    required
                    className={inputClass}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <label htmlFor="receive-notes" className="text-sm font-medium">
          Catatan penerimaan
        </label>
        <textarea
          id="receive-notes"
          name="notes"
          rows={2}
          className={inputClass}
        />
      </div>
      <ActionMessage state={state} />
      <SubmitButton pending={pending}>Simpan Penerimaan</SubmitButton>
    </form>
  );
}
