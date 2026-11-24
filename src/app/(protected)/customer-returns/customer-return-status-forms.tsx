"use client";

import {
  ActionMessage,
  SubmitButton,
  inputClass,
} from "@/components/ui";
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
      <form action={claimAction} className="space-y-3 rounded-md border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Update Status Klaim</h3>
        <ActionMessage state={claimState} />
        <input type="hidden" name="id" value={id} />
        <div>
          <label htmlFor="claim_status" className="text-sm font-medium">
            Status Klaim
          </label>
          <select
            id="claim_status"
            name="status"
            defaultValue={claimStatus}
            className={inputClass}
          >
            {claimStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="claim_notes" className="text-sm font-medium">
            Catatan
          </label>
          <input
            id="claim_notes"
            name="notes"
            maxLength={500}
            className={inputClass}
            placeholder="Opsional"
          />
        </div>
        <SubmitButton pending={claimPending}>Simpan Status Klaim</SubmitButton>
      </form>

      <form action={fundAction} className="space-y-3 rounded-md border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Update Status Dana</h3>
        <ActionMessage state={fundState} />
        <input type="hidden" name="id" value={id} />
        <div>
          <label htmlFor="fund_status" className="text-sm font-medium">
            Status Dana
          </label>
          <select
            id="fund_status"
            name="status"
            defaultValue={fundStatus}
            className={inputClass}
          >
            {fundStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="paid_date" className="text-sm font-medium">
            Tanggal Dana Dikembalikan
          </label>
          <input id="paid_date" name="paid_date" type="date" className={inputClass} />
        </div>
        <div>
          <label htmlFor="fund_notes" className="text-sm font-medium">
            Catatan
          </label>
          <input
            id="fund_notes"
            name="notes"
            maxLength={500}
            className={inputClass}
            placeholder="Opsional"
          />
        </div>
        <SubmitButton pending={fundPending}>Simpan Status Dana</SubmitButton>
      </form>
    </div>
  );
}
