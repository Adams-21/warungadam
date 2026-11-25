"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import { optionalTextSchema, uuidSchema } from "@/lib/schemas";
import { getBlockingRelations } from "../master-data-rules";

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
  try {
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
    return { error: getErrorMessage(error) };
  }
}

export async function updateSupplierAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
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
    return { error: getErrorMessage(error) };
  }
}

export async function toggleSupplierActiveAction(
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsedId = uuidSchema.safeParse(formData.get("id"));
    if (!parsedId.success) {
      return { error: "ID supplier tidak valid." };
    }

    const user = await requireAuth();
    const existing = await prisma.suppliers.findUnique({
      where: { id: parsedId.data },
      select: { is_active: true },
    });
    if (!existing) {
      return { error: "Supplier tidak ditemukan." };
    }

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
    return { success: "Status supplier berhasil diubah." };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function deleteSupplierAction(
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsedId = uuidSchema.safeParse(formData.get("id"));
    if (!parsedId.success) {
      return { error: "ID supplier tidak valid." };
    }

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
    if (!supplier) {
      return { error: "Supplier tidak ditemukan." };
    }

    const hasRelations =
      getBlockingRelations("SUPPLIER", supplier._count).length > 0;
    if (hasRelations) {
      return {
        error: "Supplier masih memiliki relasi transaksi dan tidak dapat dihapus.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.suppliers.delete({ where: { id: parsedId.data } });
      await logActivity(tx, user.id, "Suppliers", parsedId.data, "DELETE", {
        name: supplier.name,
      });
    });

    revalidateSupplierPaths();
    return { success: `Supplier ${supplier.name} berhasil dihapus.` };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
