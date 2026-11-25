"use client";

import { useActionState, useState } from "react";
import {
  ActionMessage,
  Button,
  Input,
  Label,
  SubmitButton,
} from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { voidSaleAction } from "./actions";

export function VoidSaleButton({
  saleId,
  compact = false,
}: {
  saleId: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    voidSaleAction,
    EMPTY_ACTION_STATE,
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="destructive"
        size={compact ? "xs" : "default"}
        onClick={() => setOpen(true)}
      >
        Batalkan
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className={compact ? "w-56 space-y-2" : "max-w-md space-y-2"}
    >
      <input type="hidden" name="id" value={saleId} />
      <Label
        htmlFor={`void-reason-${saleId}`}
        className="text-xs font-medium"
      >
        Alasan pembatalan
      </Label>
      <Input
        id={`void-reason-${saleId}`}
        name="reason"
        required
        maxLength={500}
        placeholder="Contoh: salah input transaksi"
        className="h-9"
      />
      <div className="flex flex-wrap gap-2">
        <SubmitButton
          pending={pending}
          className="h-8 rounded-lg bg-rose-600 px-3 text-white hover:bg-rose-700"
        >
          Konfirmasi Batal
        </SubmitButton>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Urungkan
        </Button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}
