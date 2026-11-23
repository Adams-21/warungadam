"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optionalTextSchema, uuidSchema } from "@/lib/schemas";

const settingsSchema = z.object({
  id: z.string(),
  business_name: z
    .string()
    .trim()
    .min(1, "Nama bisnis wajib diisi")
    .max(150),
  address: optionalTextSchema,
  phone: optionalTextSchema,
  default_admin_fee_rate: z.coerce
    .number()
    .finite()
    .min(0, "Rate tidak boleh negatif")
    .max(100, "Rate maksimal 100"),
  session_timeout_minutes: z.coerce
    .number()
    .int()
    .min(1, "Minimal 1 menit")
    .max(1440, "Maksimal 1440 menit"),
});

const namedSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
});

const REVALIDATE_PATHS = [
  "/master/settings",
  "/master/products",
  "/dashboard",
];

function revalidateSettingsPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function updateBusinessSettingsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = settingsSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    business_name: formData.get("business_name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    default_admin_fee_rate: String(
      formData.get("default_admin_fee_rate") ?? "",
    ),
    session_timeout_minutes: String(
      formData.get("session_timeout_minutes") ?? "",
    ),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();
  const validId = uuidSchema.safeParse(parsed.data.id);
  const targetId = validId.success ? validId.data : randomUUID();

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.businessSettings.findUnique({
        where: { id: targetId },
        select: { id: true },
      });

      const result = await tx.businessSettings.upsert({
        where: { id: targetId },
        create: {
          id: targetId,
          business_name: parsed.data.business_name,
          address: parsed.data.address,
          phone: parsed.data.phone,
          default_admin_fee_rate: parsed.data.default_admin_fee_rate,
          session_timeout_minutes: parsed.data.session_timeout_minutes,
        },
        update: {
          business_name: parsed.data.business_name,
          address: parsed.data.address,
          phone: parsed.data.phone,
          default_admin_fee_rate: parsed.data.default_admin_fee_rate,
          session_timeout_minutes: parsed.data.session_timeout_minutes,
        },
      });

      await logActivity(
        tx,
        user.id,
        "BusinessSettings",
        result.id,
        existing ? "UPDATE" : "CREATE",
        {
          business_name: result.business_name,
          default_admin_fee_rate: result.default_admin_fee_rate.toString(),
          session_timeout_minutes: result.session_timeout_minutes,
        },
      );

      return result;
    });

    revalidateSettingsPaths();
    return { success: `Pengaturan ${saved.business_name} tersimpan.` };
  } catch (error) {
    return toActionError(error, "Gagal menyimpan pengaturan bisnis.");
  }
}

export async function createSalesChannelAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = namedSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    const channel = await prisma.$transaction(async (tx) => {
      const created = await tx.salesChannels.create({
        data: {
          name: parsed.data.name,
          is_marketplace: formData.get("is_marketplace") === "on",
        },
      });
      await logActivity(tx, user.id, "SalesChannels", created.id, "CREATE", {
        name: created.name,
        is_marketplace: created.is_marketplace,
      });
      return created;
    });

    revalidateSettingsPaths();
    return { success: `Kanal ${channel.name} ditambahkan.` };
  } catch (error) {
    return toActionError(error, "Gagal menambah kanal penjualan.");
  }
}

export async function toggleSalesChannelActiveAction(
  formData: FormData,
): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const existing = await prisma.salesChannels.findUnique({
    where: { id: parsedId.data },
    select: { is_active: true },
  });
  if (!existing) return;

  const nextValue = !existing.is_active;
  await prisma.$transaction(async (tx) => {
    await tx.salesChannels.update({
      where: { id: parsedId.data },
      data: { is_active: nextValue },
    });
    await logActivity(tx, user.id, "SalesChannels", parsedId.data, "UPDATE", {
      is_active: nextValue,
    });
  });

  revalidateSettingsPaths();
}

export async function createExpenseCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = namedSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.expenseCategories.create({
        data: { name: parsed.data.name },
      });
      await logActivity(tx, user.id, "ExpenseCategories", created.id, "CREATE", {
        name: created.name,
      });
      return created;
    });

    revalidateSettingsPaths();
    return { success: `Kategori ${category.name} ditambahkan.` };
  } catch (error) {
    return toActionError(error, "Gagal menambah kategori pengeluaran.");
  }
}

export async function toggleExpenseCategoryActiveAction(
  formData: FormData,
): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const existing = await prisma.expenseCategories.findUnique({
    where: { id: parsedId.data },
    select: { is_active: true },
  });
  if (!existing) return;

  const nextValue = !existing.is_active;
  await prisma.$transaction(async (tx) => {
    await tx.expenseCategories.update({
      where: { id: parsedId.data },
      data: { is_active: nextValue },
    });
    await logActivity(
      tx,
      user.id,
      "ExpenseCategories",
      parsedId.data,
      "UPDATE",
      { is_active: nextValue },
    );
  });

  revalidateSettingsPaths();
}
