"use client";

import {
  ActionMessage,
  Button,
  Input,
  Label,
  SubmitButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { CompactActionForm } from "@/components/compact-action-form";
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
      <Button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40"
      />
      <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <Button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            Tutup
          </Button>
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
      <Button type="button" className={className} onClick={() => setOpen(true)}>
        {label ?? (isCorrection ? "Koreksi" : "Tambah Pengeluaran")}
      </Button>

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
            <Label htmlFor="description" className="text-sm font-medium">
              Nama / deskripsi
            </Label>
            <Input
              id="description"
              name="description"
              required
              maxLength={500}
              defaultValue={expense?.description ?? ""}
              className="mt-1 h-10 bg-white"
              placeholder="Contoh: Pembayaran listrik toko"
            />
          </div>

          <div>
            <Label htmlFor="expense_category_id" className="text-sm font-medium">
              Kategori
            </Label>
            <SelectField
              name="expense_category_id"
              defaultValue={expense?.category_id ?? ""}
              id="expense_category_id"
              className="mt-1 h-10 w-full bg-white"
              placeholder="Pilih kategori"
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="amount" className="text-sm font-medium">
                Nominal (Rp)
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                defaultValue={expense ? String(expense.amount) : ""}
                className="mt-1 h-10 bg-white"
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="expense_date" className="text-sm font-medium">
                Tanggal
              </Label>
              <Input
                id="expense_date"
                name="expense_date"
                type="date"
                required
                defaultValue={expense?.expense_date ?? ""}
                className="mt-1 h-10 bg-white"
              />
            </div>
          </div>

          {isCorrection ? (
            <div>
              <Label htmlFor="reason" className="text-sm font-medium">
                Alasan koreksi
              </Label>
              <Input
                id="reason"
                name="reason"
                required
                maxLength={500}
                className="mt-1 h-10 bg-white"
                placeholder="Contoh: Salah input nominal"
              />
            </div>
          ) : null}

          <ActionMessage state={state} />
          <div className="flex items-center gap-3">
            <SubmitButton pending={pending} className={primaryButtonClass}>
              {isCorrection ? "Simpan Koreksi" : "Simpan Pengeluaran"}
            </SubmitButton>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className={secondaryButtonClass}
            >
              Batal
            </Button>
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
      <Button
        type="button"
        className={secondaryButtonClass}
        onClick={() => setOpen(true)}
      >
        Hapus
      </Button>

      <ModalFrame
        open={open}
        onClose={() => setOpen(false)}
        title="Batalkan Pengeluaran"
        description="Data tidak dihapus permanen dan tetap tersimpan sebagai riwayat."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={expense.id} />
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {expense.description} — {expense.category_name}
          </p>
          <div>
            <Label htmlFor="void-reason" className="text-sm font-medium">
              Alasan pembatalan
            </Label>
            <Input
              id="void-reason"
              name="reason"
              required
              maxLength={500}
              className="mt-1 h-10 bg-white"
              placeholder="Contoh: Duplikat input"
            />
          </div>
          <ActionMessage state={state} />
          <div className="flex items-center gap-3">
            <SubmitButton pending={pending} className={primaryButtonClass}>
              Batalkan Pengeluaran
            </SubmitButton>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className={secondaryButtonClass}
            >
              Tutup
            </Button>
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
          <Label htmlFor="rename-category" className="text-sm font-medium">
            Nama kategori
          </Label>
          <Input
            id="rename-category"
            name="name"
            required
            maxLength={100}
            defaultValue={category.name}
            className="mt-1 h-10 bg-white"
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
          <Label htmlFor="category-name" className="text-sm font-medium">
            Nama kategori baru
          </Label>
          <Input
            id="category-name"
            name="name"
            required
            maxLength={100}
            className="mt-1 h-10 bg-white"
            placeholder="Contoh: Internet & Pulsa"
          />
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Kategori</SubmitButton>
      </form>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-teal-50/40">
            <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kategori
            </TableHead>
            <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </TableHead>
            <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100">
          {categories.map((category) => (
            <TableRow key={category.id} className="hover:bg-teal-50/40">
              <TableCell className="px-3 py-3 text-sm text-slate-800">
                {category.name}
              </TableCell>
              <TableCell className="px-3 py-3 text-sm text-slate-800">
                <CompactActionForm
                  action={toggleExpenseCategoryActiveAction}
                  submitLabel={category.is_active ? "Aktif" : "Nonaktif"}
                >
                  <input type="hidden" name="id" value={category.id} />
                </CompactActionForm>
              </TableCell>
              <TableCell className="px-3 py-3 text-sm text-slate-800">
                <Button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setRenaming(category)}
                >
                  Ubah
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {renaming ? (
        <RenameCategoryModal
          category={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}
    </div>
  );
}
