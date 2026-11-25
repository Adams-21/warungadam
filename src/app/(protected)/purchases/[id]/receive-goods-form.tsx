"use client";

import { useActionState } from "react";
import {
  ActionMessage,
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
} from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { formatNumber } from "@/lib/format";
import { receiveGoodsAction } from "./actions";
import type { PurchaseItemView } from "../types";

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
        <Label htmlFor="received_at" className="text-sm font-medium">
          Tanggal diterima
        </Label>
        <Input
          id="received_at"
          name="received_at"
          type="date"
          required
          defaultValue={today}
          className="mt-1 h-10 bg-white"
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-teal-50/40">
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Varian</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Sisa</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah Diterima</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {receivableItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-teal-50/40">
                <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{item.variant_label}</TableCell>
                <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                  {formatNumber(item.remaining_qty, 4)} {item.unit_name}
                </TableCell>
                <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                  <input type="hidden" name="purchase_item_id" value={item.id} />
                  <Input
                    name="received_qty"
                    type="number"
                    min="0"
                    max={item.remaining_qty}
                    step="0.0001"
                    defaultValue="0"
                    required
                    className="mt-1 h-10 bg-white"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div>
        <Label htmlFor="receive-notes" className="text-sm font-medium">
          Catatan penerimaan
        </Label>
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
