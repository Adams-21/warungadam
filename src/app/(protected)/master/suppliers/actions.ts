"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optionalTextSchema, uuidSchema } from "@/lib/schemas";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Nama supplier wajib diisi").max(150),
  phone: z.string().trim().min(1, "Telepon wajib diisi").max(30),
  address: optionalTextSchema,
  notes: optionalTextSchema,
});

const updateSupplierSchema = supplierSchema.extend({ id: uuidSchema });

const REVALIDATE_PATHS = [
  "/master/suppliers",
  "/master/products",
  "/dashboard",
];

function revalidateSupplierPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function createSupplierAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    const supplier = await prisma.$transaction(async (tx) => {
      const created = await tx.suppliers.create({
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          address: parsed.data.address,
          notes: parsed.data.notes,
        },
      });
      await logActivity(tx, user.id, "Suppliers", created.id, "CREATE", {
        name: created.name,
        phone: created.phone,
      });
      return created;
    });

    revalidateSupplierPaths();
    return { success: `Supplier ${supplier.name} ditambahkan.` };
  } catch (error) {
    return toActionError(error, "Gagal menambah supplier.");
  }
}

export async function updateSupplierAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateSupplierSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    const supplier = await prisma.$transaction(async (tx) => {
      const updated = await tx.suppliers.update({
        where: { id: parsed.data.id },
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          address: parsed.data.address,
          notes: parsed.data.notes,
        },
      });
      await logActivity(tx, user.id, "Suppliers", updated.id, "UPDATE", {
        name: updated.name,
        phone: updated.phone,
      });
      return updated;
    });

    revalidateSupplierPaths();
    return { success: `Supplier ${supplier.name} diperbarui.` };
  } catch (error) {
    return toActionError(error, "Gagal memperbarui supplier.");
  }
}

export async function toggleSupplierActiveAction(
  formData: FormData,
): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const existing = await prisma.suppliers.findUnique({
    where: { id: parsedId.data },
    select: { is_active: true },
  });
  if (!existing) return;

  const nextValue = !existing.is_active;
  await prisma.$transaction(async (tx) => {
    await tx.suppliers.update({
      where: { id: parsedId.data },
      data: { is_active: nextValue },
    });
    await logActivity(tx, user.id, "Suppliers", parsedId.data, "UPDATE", {
      is_active: nextValue,
    });
  });

  revalidateSupplierPaths();
}

export async function deleteSupplierAction(formData: FormData): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const supplier = await prisma.suppliers.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      name: true,
      _count: {
        select: { purchases: true, variant_suppliers: true },
      },
    },
  });
  if (!supplier) return;

  const isReferenced =
    supplier._count.purchases > 0 || supplier._count.variant_suppliers > 0;
  if (isReferenced) return;

  await prisma.$transaction(async (tx) => {
    await tx.suppliers.delete({ where: { id: parsedId.data } });
    await logActivity(tx, user.id, "Suppliers", parsedId.data, "DELETE", {
      name: supplier.name,
    });
  });

  revalidateSupplierPaths();
}
