"use client";

import { useActionState } from "react";
import {
  ActionMessage,
  Input,
  Label,
  Panel,
  SubmitButton,
  inputClass,
} from "@/components/ui";
import { CompactActionForm } from "@/components/compact-action-form";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import {
  createSupplierAction,
  deleteSupplierAction,
  toggleSupplierActiveAction,
  updateSupplierAction,
} from "./actions";
import type { SupplierView } from "./types";

function SupplierCreateForm() {
  const [state, formAction, pending] = useActionState(
    createSupplierAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Tambah Supplier"
      description="Data supplier dapat dipakai saat menyusun harga beli varian."
    >
      <form action={formAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="supplier-create-name" className="text-sm font-medium">
              Nama supplier
            </Label>
            <Input
              id="supplier-create-name"
              name="name"
              required
              className="mt-1 h-10 bg-white"
              placeholder="Contoh: PT Sumber Rejeki"
            />
          </div>
          <div>
            <Label
              htmlFor="supplier-create-phone"
              className="text-sm font-medium"
            >
              Telepon
            </Label>
            <Input
              id="supplier-create-phone"
              name="phone"
              required
              className="mt-1 h-10 bg-white"
              placeholder="0812..."
            />
          </div>
        </div>
        <div>
          <Label
            htmlFor="supplier-create-address"
            className="text-sm font-medium"
          >
            Alamat
          </Label>
          <textarea
            id="supplier-create-address"
            name="address"
            rows={2}
            className={inputClass}
            placeholder="Opsional"
          />
        </div>
        <div>
          <Label htmlFor="supplier-create-notes" className="text-sm font-medium">
            Catatan
          </Label>
          <textarea
            id="supplier-create-notes"
            name="notes"
            rows={2}
            className={inputClass}
            placeholder="Opsional"
          />
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Supplier</SubmitButton>
      </form>
    </Panel>
  );
}

function SupplierEditForm({ supplier }: { supplier: SupplierView }) {
  const [state, formAction, pending] = useActionState(
    updateSupplierAction,
    EMPTY_ACTION_STATE,
  );
  const formId = `edit-supplier-${supplier.id}`;

  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-800 hover:text-slate-950">
        Edit data
      </summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={supplier.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${formId}-name`} className="text-sm font-medium">
              Nama supplier
            </Label>
            <Input
              id={`${formId}-name`}
              name="name"
              required
              defaultValue={supplier.name}
              className="mt-1 h-10 bg-white"
            />
          </div>
          <div>
            <Label htmlFor={`${formId}-phone`} className="text-sm font-medium">
              Telepon
            </Label>
            <Input
              id={`${formId}-phone`}
              name="phone"
              required
              defaultValue={supplier.phone}
              className="mt-1 h-10 bg-white"
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`${formId}-address`} className="text-sm font-medium">
            Alamat
          </Label>
          <textarea
            id={`${formId}-address`}
            name="address"
            rows={2}
            defaultValue={supplier.address}
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor={`${formId}-notes`} className="text-sm font-medium">
            Catatan
          </Label>
          <textarea
            id={`${formId}-notes`}
            name="notes"
            rows={2}
            defaultValue={supplier.notes}
            className={inputClass}
          />
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Perbarui Supplier</SubmitButton>
      </form>
    </details>
  );
}

export function SuppliersManager({
  suppliers,
}: {
  suppliers: SupplierView[];
}) {
  return (
    <div className="space-y-6">
      <SupplierCreateForm />

      <Panel
        title="Daftar Supplier"
        description={`${suppliers.length} supplier terdaftar.`}
      >
        {suppliers.length === 0 ? (
          <p className="text-sm text-slate-600">Belum ada supplier.</p>
        ) : (
          <div className="space-y-3">
            {suppliers.map((supplier) => {
              const isReferenced =
                supplier.purchase_count > 0 || supplier.variant_count > 0;

              return (
                <div
                  key={supplier.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {supplier.name}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {supplier.phone}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {supplier.purchase_count} pembelian ·{" "}
                        {supplier.variant_count} varian
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CompactActionForm
                        action={toggleSupplierActiveAction}
                        submitLabel={
                          supplier.is_active ? "Nonaktifkan" : "Aktifkan"
                        }
                      >
                        <input type="hidden" name="id" value={supplier.id} />
                      </CompactActionForm>
                      <CompactActionForm
                        action={deleteSupplierAction}
                        submitLabel="Hapus"
                        buttonClassName={`rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50${
                          isReferenced ? " pointer-events-none opacity-50" : ""
                        }`}
                      >
                        <input type="hidden" name="id" value={supplier.id} />
                      </CompactActionForm>
                    </div>
                  </div>

                  {supplier.address ? (
                    <p className="px-3 py-3 align-top text-sm text-slate-800 px-0 pb-0">
                      Alamat: {supplier.address}
                    </p>
                  ) : null}
                  {supplier.notes ? (
                    <p className="px-3 py-3 align-top text-sm text-slate-800 px-0 pb-0">
                      Catatan: {supplier.notes}
                    </p>
                  ) : null}

                  <SupplierEditForm supplier={supplier} />
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
