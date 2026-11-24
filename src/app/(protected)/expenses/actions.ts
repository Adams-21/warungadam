"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, toActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { priceSchema, uuidSchema } from "@/lib/schemas";
import {
  validateExpenseCategoryName,
  validateExpenseInput,
  validateExpenseVoidReason,
} from "./expense-rules";

const REVALIDATE_PATHS = ["/expenses", "/dashboard", "/master/settings"];

const expenseInputSchema = z.object({
  expense_category_id: uuidSchema,
  expense_date: z.date(),
  amount: priceSchema,
  description: z
    .string()
    .trim()
    .min(1, "Nama/deskripsi pengeluaran wajib diisi")
    .max(500, "Deskripsi pengeluaran terlalu panjang"),
});

const correctionSchema = expenseInputSchema.extend({
  id: uuidSchema,
  reason: z
    .string()
    .trim()
    .min(1, "Alasan koreksi wajib diisi")
    .max(500, "Alasan koreksi terlalu panjang"),
});

const voidSchema = z.object({
  id: uuidSchema,
  reason: z
    .string()
    .trim()
    .min(1, "Alasan pembatalan wajib diisi")
    .max(500, "Alasan pembatalan terlalu panjang"),
});

const categoryNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi")
    .max(100, "Nama kategori terlalu panjang"),
});

const categoryUpdateSchema = categoryNameSchema.extend({ id: uuidSchema });
const categoryIdSchema = z.object({ id: uuidSchema });

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidateExpensePaths(): void {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

async function activeCategoryIds(
  tx: Prisma.TransactionClient,
): Promise<string[]> {
  const categories = await tx.expenseCategories.findMany({
    where: { is_active: true },
    select: { id: true },
  });
  return categories.map((category) => category.id);
}

export async function createExpenseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = expenseInputSchema.safeParse({
    expense_category_id: formData.get("expense_category_id"),
    expense_date: parseDateInput(formData.get("expense_date")),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    await prisma.$transaction(async (tx) => {
      const validationError = validateExpenseInput(parsed.data, {
        validCategoryIds: await activeCategoryIds(tx),
      });
      if (validationError) throw new ActionError(validationError);

      const created = await tx.expenses.create({
        data: { ...parsed.data, created_by_id: user.id },
      });
      await logActivity(tx, user.id, "Expenses", created.id, "CREATE", {
        amount: created.amount.toString(),
        description: created.description,
        expense_category_id: created.expense_category_id,
      });
    });

    revalidateExpensePaths();
    return { success: "Pengeluaran operasional berhasil dicatat." };
  } catch (error) {
    return toActionError(error, "Gagal mencatat pengeluaran operasional.");
  }
}

export async function correctExpenseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = correctionSchema.safeParse({
    id: formData.get("id"),
    expense_category_id: formData.get("expense_category_id"),
    expense_date: parseDateInput(formData.get("expense_date")),
    amount: formData.get("amount"),
    description: formData.get("description"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expenses.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, is_void: true, created_by_id: true },
      });

      if (!existing) {
        throw new ActionError("Data pengeluaran tidak ditemukan.");
      }
      if (existing.is_void) {
        throw new ActionError(
          "Pengeluaran yang sudah dibatalkan tidak dapat dikoreksi.",
        );
      }
      if (existing.created_by_id !== user.id) {
        throw new ActionError(
          "Anda hanya dapat mengoreksi pengeluaran yang Anda buat.",
        );
      }

      const validationError = validateExpenseInput(parsed.data, {
        validCategoryIds: await activeCategoryIds(tx),
      });
      if (validationError) throw new ActionError(validationError);

      const voidReason = `Dikoreksi: ${parsed.data.reason}`;
      const voided = await tx.expenses.update({
        where: { id: parsed.data.id },
        data: { is_void: true, void_reason: voidReason, voided_by_id: user.id },
        select: { id: true },
      });
      await logActivity(tx, user.id, "Expenses", voided.id, "VOID", {
        reason: voidReason,
      });

      const corrected = await tx.expenses.create({
        data: {
          expense_category_id: parsed.data.expense_category_id,
          expense_date: parsed.data.expense_date,
          amount: parsed.data.amount,
          description: parsed.data.description,
          created_by_id: user.id,
        },
      });
      await logActivity(tx, user.id, "Expenses", corrected.id, "CREATE", {
        correction_of: parsed.data.id,
        amount: corrected.amount.toString(),
        description: corrected.description,
      });
    });

    revalidateExpensePaths();
    return {
      success:
        "Pengeluaran berhasil dikoreksi; data lama tetap tersimpan sebagai riwayat.",
    };
  } catch (error) {
    return toActionError(error, "Gagal mengoreksi pengeluaran.");
  }
}

export async function voidExpenseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = voidSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const reasonError = validateExpenseVoidReason(parsed.data.reason);
  if (reasonError) return { error: reasonError };

  const user = await requireAuth();

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expenses.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, is_void: true, created_by_id: true },
      });

      if (!existing) {
        throw new ActionError("Data pengeluaran tidak ditemukan.");
      }
      if (existing.is_void) {
        throw new ActionError("Pengeluaran ini sudah dibatalkan.");
      }
      if (existing.created_by_id !== user.id) {
        throw new ActionError(
          "Anda hanya dapat membatalkan pengeluaran yang Anda buat.",
        );
      }

      await tx.expenses.update({
        where: { id: parsed.data.id },
        data: {
          is_void: true,
          void_reason: parsed.data.reason.trim(),
          voided_by_id: user.id,
        },
      });
      await logActivity(tx, user.id, "Expenses", existing.id, "VOID", {
        reason: parsed.data.reason.trim(),
      });
    });

    revalidateExpensePaths();
    return { success: "Pengeluaran dibatalkan dan tidak dihitung lagi." };
  } catch (error) {
    return toActionError(error, "Gagal membatalkan pengeluaran.");
  }
}

export async function createExpenseCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categoryNameSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const nameError = validateExpenseCategoryName(parsed.data.name);
  if (nameError) return { error: nameError };

  const user = await requireAuth();

  try {
    const category = await prisma.$transaction(async (tx) => {
      const existing = await tx.expenseCategories.findUnique({
        where: { name: parsed.data.name },
        select: { id: true },
      });
      if (existing) {
        throw new ActionError("Nama kategori sudah digunakan.");
      }

      const created = await tx.expenseCategories.create({
        data: { name: parsed.data.name },
      });
      await logActivity(tx, user.id, "ExpenseCategories", created.id, "CREATE", {
        name: created.name,
      });
      return created;
    });

    revalidateExpensePaths();
    return { success: `Kategori ${category.name} ditambahkan.` };
  } catch (error) {
    return toActionError(error, "Gagal menambah kategori pengeluaran.");
  }
}

export async function renameExpenseCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categoryUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const nameError = validateExpenseCategoryName(parsed.data.name);
  if (nameError) return { error: nameError };

  const user = await requireAuth();

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expenseCategories.findUnique({
        where: { id: parsed.data.id },
        select: { id: true },
      });
      if (!existing) {
        throw new ActionError("Kategori tidak ditemukan.");
      }

      const duplicate = await tx.expenseCategories.findFirst({
        where: { name: parsed.data.name, id: { not: parsed.data.id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ActionError("Nama kategori sudah digunakan.");
      }

      await tx.expenseCategories.update({
        where: { id: parsed.data.id },
        data: { name: parsed.data.name },
      });
      await logActivity(tx, user.id, "ExpenseCategories", parsed.data.id, "UPDATE", {
        name: parsed.data.name,
      });
    });

    revalidateExpensePaths();
    return { success: `Kategori berhasil diubah menjadi ${parsed.data.name}.` };
  } catch (error) {
    return toActionError(error, "Gagal mengubah kategori pengeluaran.");
  }
}

export async function toggleExpenseCategoryActiveAction(
  formData: FormData,
): Promise<void> {
  const parsed = categoryIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const user = await requireAuth();

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expenseCategories.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, is_active: true },
      });
      if (!existing) return;

      const nextValue = !existing.is_active;
      await tx.expenseCategories.update({
        where: { id: parsed.data.id },
        data: { is_active: nextValue },
      });
      await logActivity(
        tx,
        user.id,
        "ExpenseCategories",
        parsed.data.id,
        "UPDATE",
        { is_active: nextValue },
      );
    });

    revalidateExpensePaths();
  } catch (error) {
    console.error(error);
  }
}
