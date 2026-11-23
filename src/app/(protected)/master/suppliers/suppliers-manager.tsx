"use client";

import { useActionState } from "react";
import {
  ActionMessage,
  Panel,
  SubmitButton,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import {
  createSupplierAction,
  deleteSupplierAction,
  toggleSupplierActiveAction,
  updateSupplierAction,
} from "./actions";
import type { SupplierView } from "./types";

const tdClass = "px-3 py-3 align-top text-sm text-zinc-800";

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
            <label htmlFor="supplier-create-name" className="text-sm font-medium">
              Nama supplier
            </label>
            <input
              id="supplier-create-name"
              name="name"
              required
              className={inputClass}
              placeholder="Contoh: PT Sumber Rejeki"
            />
          </div>
          <div>
            <label
              htmlFor="supplier-create-phone"
              className="text-sm font-medium"
            >
              Telepon
            </label>
            <input
              id="supplier-create-phone"
              name="phone"
              required
              className={inputClass}
              placeholder="0812..."
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="supplier-create-address"
            className="text-sm font-medium"
          >
            Alamat
          </label>
          <textarea
            id="supplier-create-address"
            name="address"
            rows={2}
            className={inputClass}
            placeholder="Opsional"
          />
        </div>
        <div>
          <label htmlFor="supplier-create-notes" className="text-sm font-medium">
            Catatan
          </label>
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
      <summary className="cursor-pointer text-sm font-medium text-zinc-800 hover:text-zinc-950">
        Edit data
      </summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={supplier.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-name`} className="text-sm font-medium">
              Nama supplier
            </label>
            <input
              id={`${formId}-name`}
              name="name"
              required
              defaultValue={supplier.name}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-phone`} className="text-sm font-medium">
              Telepon
            </label>
            <input
              id={`${formId}-phone`}
              name="phone"
              required
              defaultValue={supplier.phone}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${formId}-address`} className="text-sm font-medium">
            Alamat
          </label>
          <textarea
            id={`${formId}-address`}
            name="address"
            rows={2}
            defaultValue={supplier.address}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-notes`} className="text-sm font-medium">
            Catatan
          </label>
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
          <p className="text-sm text-zinc-600">Belum ada supplier.</p>
        ) : (
          <div className="space-y-3">
            {suppliers.map((supplier) => {
              const isReferenced =
                supplier.purchase_count > 0 || supplier.variant_count > 0;

              return (
                <div
                  key={supplier.id}
                  className="rounded-lg border border-zinc-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {supplier.name}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-600">
                        {supplier.phone}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {supplier.purchase_count} pembelian ·{" "}
                        {supplier.variant_count} varian
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={toggleSupplierActiveAction}>
                        <input type="hidden" name="id" value={supplier.id} />
                        <button type="submit" className={secondaryButtonClass}>
                          {supplier.is_active
                            ? "Nonaktifkan"
                            : "Aktifkan"}
                        </button>
                      </form>
                      <form action={deleteSupplierAction}>
                        <input type="hidden" name="id" value={supplier.id} />
                        <button
                          type="submit"
                          disabled={isReferenced}
                          title={
                            isReferenced
                              ? "Supplier masih digunakan pembelian atau harga varian"
                              : undefined
                          }
                          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </form>
                    </div>
                  </div>

                  {supplier.address ? (
                    <p className={`${tdClass} px-0 pb-0`}>
                      Alamat: {supplier.address}
                    </p>
                  ) : null}
                  {supplier.notes ? (
                    <p className={`${tdClass} px-0 pb-0`}>
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
