"use client";

import {
  ActionMessage,
  Input,
  Label,
  SubmitButton,
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { useActionState } from "react";
import {
  updateCustomerReturnClaimStatusAction,
  updateCustomerReturnFundStatusAction,
} from "./actions";

export function CustomerReturnStatusForms({
  id,
  claimStatus,
  fundStatus,
  claimStatuses,
  fundStatuses,
}: {
  id: string;
  claimStatus: string;
  fundStatus: string;
  claimStatuses: string[];
  fundStatuses: string[];
}) {
  const [claimState, claimAction, claimPending] = useActionState(
    updateCustomerReturnClaimStatusAction,
    EMPTY_ACTION_STATE,
  );
  const [fundState, fundAction, fundPending] = useActionState(
    updateCustomerReturnFundStatusAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form action={claimAction} className="space-y-3 rounded-md border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Update Status Klaim</h3>
        <ActionMessage state={claimState} />
        <input type="hidden" name="id" value={id} />
        <div>
          <Label htmlFor="claim_status" className="text-sm font-medium">
            Status Klaim
          </Label>
          <SelectField
            name="status"
            defaultValue={claimStatus}
            id="claim_status"
            className="mt-1 h-10 w-full bg-white"
          >
            {claimStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <Label htmlFor="claim_notes" className="text-sm font-medium">
            Catatan
          </Label>
          <Input
            id="claim_notes"
            name="notes"
            maxLength={500}
            className="mt-1 h-10 bg-white"
            placeholder="Opsional"
          />
        </div>
        <SubmitButton pending={claimPending}>Simpan Status Klaim</SubmitButton>
      </form>

      <form action={fundAction} className="space-y-3 rounded-md border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Update Status Dana</h3>
        <ActionMessage state={fundState} />
        <input type="hidden" name="id" value={id} />
        <div>
          <Label htmlFor="fund_status" className="text-sm font-medium">
            Status Dana
          </Label>
          <SelectField
            name="status"
            defaultValue={fundStatus}
            id="fund_status"
            className="mt-1 h-10 w-full bg-white"
          >
            {fundStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <Label htmlFor="paid_date" className="text-sm font-medium">
            Tanggal Dana Dikembalikan
          </Label>
          <Input id="paid_date" name="paid_date" type="date" className="mt-1 h-10 bg-white" />
        </div>
        <div>
          <Label htmlFor="fund_notes" className="text-sm font-medium">
            Catatan
          </Label>
          <Input
            id="fund_notes"
            name="notes"
            maxLength={500}
            className="mt-1 h-10 bg-white"
            placeholder="Opsional"
          />
        </div>
        <SubmitButton pending={fundPending}>Simpan Status Dana</SubmitButton>
      </form>
    </div>
  );
}
