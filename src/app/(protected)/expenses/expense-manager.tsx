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
import {
  correctExpenseAction,
  createExpenseAction,
  createExpenseCategoryAction,
  renameExpenseCategoryAction,
  toggleExpenseCategoryActiveAction,
  voidExpenseAction,
} from "./actions";
import type { ExpenseCategoryView, ExpenseView } from "./types";

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
    <div className="fixed inset-0 z-50 flex justify-end">
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

export function ExpenseFormModal({
  categories,
  expense,
  label,
  className = secondaryButtonClass,
}: {
  categories: ExpenseCategoryView[];
  expense?: ExpenseView;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const isCorrection = Boolean(expense);
  const [state, formAction, pending] = useActionState(
    isCorrection ? correctExpenseAction : createExpenseAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label ?? (isCorrection ? "Koreksi" : "Tambah Pengeluaran")}
      </button>

      <ModalFrame
        open={open}
        onClose={() => setOpen(false)}
        title={isCorrection ? "Koreksi Pengeluaran" : "Tambah Pengeluaran"}
        description={
          isCorrection
            ? "Data lama akan dibatalkan dan data baru dibuat sebagai pengganti."
            : "Catat biaya operasional di luar HPP produk dan kemasan."
        }
      >
        <form action={formAction} className="space-y-4">
          {expense ? <input type="hidden" name="id" value={expense.id} /> : null}

          <div>
            <label htmlFor="description" className="text-sm font-medium">
              Nama / deskripsi
            </label>
            <input
              id="description"
              name="description"
              required
              maxLength={500}
              defaultValue={expense?.description ?? ""}
              className={inputClass}
              placeholder="Contoh: Pembayaran listrik toko"
            />
          </div>

          <div>
            <label htmlFor="expense_category_id" className="text-sm font-medium">
              Kategori
            </label>
            <select
              id="expense_category_id"
              name="expense_category_id"
              required
              defaultValue={expense?.category_id ?? ""}
              className={inputClass}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="amount" className="text-sm font-medium">
                Nominal (Rp)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                defaultValue={expense ? String(expense.amount) : ""}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="expense_date" className="text-sm font-medium">
                Tanggal
              </label>
              <input
                id="expense_date"
                name="expense_date"
                type="date"
                required
                defaultValue={expense?.expense_date ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          {isCorrection ? (
            <div>
              <label htmlFor="reason" className="text-sm font-medium">
                Alasan koreksi
              </label>
              <input
                id="reason"
                name="reason"
                required
                maxLength={500}
                className={inputClass}
                placeholder="Contoh: Salah input nominal"
              />
            </div>
          ) : null}

          <ActionMessage state={state} />
          <div className="flex items-center gap-3">
            <SubmitButton pending={pending} className={primaryButtonClass}>
              {isCorrection ? "Simpan Koreksi" : "Simpan Pengeluaran"}
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

export function VoidExpenseModal({ expense }: { expense: ExpenseView }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    voidExpenseAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <>
      <button
        type="button"
        className={secondaryButtonClass}
        onClick={() => setOpen(true)}
      >
        Hapus
      </button>

      <ModalFrame
        open={open}
        onClose={() => setOpen(false)}
        title="Batalkan Pengeluaran"
        description="Data tidak dihapus permanen dan tetap tersimpan sebagai riwayat."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={expense.id} />
          <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
            {expense.description} — {expense.category_name}
          </p>
          <div>
            <label htmlFor="void-reason" className="text-sm font-medium">
              Alasan pembatalan
            </label>
            <input
              id="void-reason"
              name="reason"
              required
              maxLength={500}
              className={inputClass}
              placeholder="Contoh: Duplikat input"
            />
          </div>
          <ActionMessage state={state} />
          <div className="flex items-center gap-3">
            <SubmitButton pending={pending} className={primaryButtonClass}>
              Batalkan Pengeluaran
            </SubmitButton>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={secondaryButtonClass}
            >
              Tutup
            </button>
          </div>
        </form>
      </ModalFrame>
    </>
  );
}

function RenameCategoryModal({
  category,
  onClose,
}: {
  category: ExpenseCategoryView;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    renameExpenseCategoryAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <ModalFrame
      open
      onClose={onClose}
      title="Ubah Kategori"
      description="Nama baru tetap terhubung ke riwayat pengeluaran yang sudah ada."
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={category.id} />
        <div>
          <label htmlFor="rename-category" className="text-sm font-medium">
            Nama kategori
          </label>
          <input
            id="rename-category"
            name="name"
            required
            maxLength={100}
            defaultValue={category.name}
            className={inputClass}
          />
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Simpan Perubahan</SubmitButton>
      </form>
    </ModalFrame>
  );
}

export function ExpenseCategoryManager({
  categories,
}: {
  categories: ExpenseCategoryView[];
}) {
  const [state, formAction, pending] = useActionState(
    createExpenseCategoryAction,
    EMPTY_ACTION_STATE,
  );
  const [renaming, setRenaming] = useState<ExpenseCategoryView | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="category-name" className="text-sm font-medium">
            Nama kategori baru
          </label>
          <input
            id="category-name"
            name="name"
            required
            maxLength={100}
            className={inputClass}
            placeholder="Contoh: Internet & Pulsa"
          />
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Kategori</SubmitButton>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Kategori
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-3 py-2 text-sm text-zinc-800">
                  {category.name}
                </td>
                <td className="px-3 py-2 text-sm text-zinc-800">
                  <form action={toggleExpenseCategoryActiveAction}>
                    <input type="hidden" name="id" value={category.id} />
                    <button type="submit" className={secondaryButtonClass}>
                      {category.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2 text-sm text-zinc-800">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => setRenaming(category)}
                  >
                    Ubah
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renaming ? (
        <RenameCategoryModal
          category={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}
    </div>
  );
}
