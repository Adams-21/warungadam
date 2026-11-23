"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  nullableDecimalSchema,
  optionalTextSchema,
  positiveDecimalSchema,
  uuidSchema,
} from "@/lib/schemas";

const materialSchema = z.object({
  name: z.string().trim().min(1, "Nama material wajib diisi").max(100),
  purchase_unit_id: uuidSchema,
  usage_unit_id: uuidSchema,
  conversion_factor: positiveDecimalSchema,
  min_stock: nullableDecimalSchema,
});

const packageSizeSchema = z.object({
  name: z.string().trim().min(1, "Nama ukuran wajib diisi").max(100),
  dimension_label: optionalTextSchema,
  sort_order: z.coerce.number().int().min(0, "Urutan tidak boleh negatif"),
});

const packageItemSchema = z.object({
  package_size_id: uuidSchema,
  packaging_material_id: uuidSchema,
  default_usage_qty: positiveDecimalSchema,
});

const REVALIDATE_PATHS = ["/master/packaging", "/dashboard"];

function revalidatePackagingPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function createMaterialAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    purchase_unit_id: formData.get("purchase_unit_id"),
    usage_unit_id: formData.get("usage_unit_id"),
    conversion_factor: formData.get("conversion_factor"),
    min_stock: formData.get("min_stock"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    const material = await prisma.$transaction(async (tx) => {
      const created = await tx.packagingMaterials.create({
        data: {
          name: parsed.data.name,
          purchase_unit_id: parsed.data.purchase_unit_id,
          usage_unit_id: parsed.data.usage_unit_id,
          conversion_factor: parsed.data.conversion_factor,
          min_stock: parsed.data.min_stock,
        },
      });
      await logActivity(tx, user.id, "PackagingMaterials", created.id, "CREATE", {
        name: created.name,
        conversion_factor: created.conversion_factor.toString(),
      });
      return created;
    });

    revalidatePackagingPaths();
    return { success: `Material ${material.name} ditambahkan.` };
  } catch (error) {
    return toActionError(error, "Gagal menambah material kemasan.");
  }
}

export async function toggleMaterialActiveAction(
  formData: FormData,
): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const existing = await prisma.packagingMaterials.findUnique({
    where: { id: parsedId.data },
    select: { is_active: true },
  });
  if (!existing) return;

  const nextValue = !existing.is_active;
  await prisma.$transaction(async (tx) => {
    await tx.packagingMaterials.update({
      where: { id: parsedId.data },
      data: { is_active: nextValue },
    });
    await logActivity(
      tx,
      user.id,
      "PackagingMaterials",
      parsedId.data,
      "UPDATE",
      { is_active: nextValue },
    );
  });

  revalidatePackagingPaths();
}

export async function createPackageSizeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = packageSizeSchema.safeParse({
    name: formData.get("name"),
    dimension_label: formData.get("dimension_label"),
    sort_order: String(formData.get("sort_order") ?? "0"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    const size = await prisma.$transaction(async (tx) => {
      const created = await tx.packageSizes.create({
        data: {
          name: parsed.data.name,
          dimension_label: parsed.data.dimension_label,
          sort_order: parsed.data.sort_order,
        },
      });
      await logActivity(tx, user.id, "PackageSizes", created.id, "CREATE", {
        name: created.name,
        sort_order: created.sort_order,
      });
      return created;
    });

    revalidatePackagingPaths();
    return { success: `Ukuran ${size.name} ditambahkan.` };
  } catch (error) {
    return toActionError(error, "Gagal menambah ukuran paket.");
  }
}

export async function togglePackageSizeActiveAction(
  formData: FormData,
): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const existing = await prisma.packageSizes.findUnique({
    where: { id: parsedId.data },
    select: { is_active: true },
  });
  if (!existing) return;

  const nextValue = !existing.is_active;
  await prisma.$transaction(async (tx) => {
    await tx.packageSizes.update({
      where: { id: parsedId.data },
      data: { is_active: nextValue },
    });
    await logActivity(tx, user.id, "PackageSizes", parsedId.data, "UPDATE", {
      is_active: nextValue,
    });
  });

  revalidatePackagingPaths();
}

export async function deletePackageSizeAction(
  packageSizeId: string,
): Promise<ActionState> {
  const parsedId = uuidSchema.safeParse(packageSizeId);
  if (!parsedId.success) {
    return { error: "ID ukuran paket tidak valid." };
  }

  const user = await requireAuth();
  const [size, salesCount] = await Promise.all([
    prisma.packageSizes.findUnique({
      where: { id: parsedId.data },
      select: { id: true, name: true },
    }),
    prisma.sales.count({ where: { package_size_id: parsedId.data } }),
  ]);

  if (!size) {
    return { error: "Ukuran paket tidak ditemukan." };
  }

  if (salesCount > 0) {
    return {
      error:
        "Ukuran paket sudah dipakai transaksi dan hanya bisa dinonaktifkan.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.packageSizeItems.deleteMany({
        where: { package_size_id: parsedId.data },
      });
      await tx.packageSizes.delete({ where: { id: parsedId.data } });
      await logActivity(tx, user.id, "PackageSizes", parsedId.data, "DELETE", {
        name: size.name,
      });
    });

    revalidatePath("/master/packaging");
    return { success: `Ukuran ${size.name} berhasil dihapus.` };
  } catch (error) {
    return toActionError(error, "Gagal menghapus ukuran paket.");
  }
}

export async function upsertPackageItemAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = packageItemSchema.safeParse({
    package_size_id: formData.get("package_size_id"),
    packaging_material_id: formData.get("packaging_material_id"),
    default_usage_qty: formData.get("default_usage_qty"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();
  const { package_size_id, packaging_material_id, default_usage_qty } =
    parsed.data;

  try {
    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.packageSizeItems.findUnique({
        where: {
          package_size_id_packaging_material_id: {
            package_size_id,
            packaging_material_id,
          },
        },
        select: { id: true },
      });

      const result = await tx.packageSizeItems.upsert({
        where: {
          package_size_id_packaging_material_id: {
            package_size_id,
            packaging_material_id,
          },
        },
        create: {
          package_size_id,
          packaging_material_id,
          default_usage_qty,
        },
        update: { default_usage_qty },
      });

      await logActivity(
        tx,
        user.id,
        "PackageSizeItems",
        result.id,
        existing ? "UPDATE" : "CREATE",
        {
          package_size_id,
          packaging_material_id,
          default_usage_qty: default_usage_qty.toString(),
        },
      );

      return result;
    });

    revalidatePackagingPaths();
    return { success: `Komposisi berhasil disimpan (${item.id.slice(0, 8)}).` };
  } catch (error) {
    return toActionError(error, "Gagal menyimpan komposisi paket.");
  }
}

export async function deletePackageItemAction(
  formData: FormData,
): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const existing = await prisma.packageSizeItems.findUnique({
    where: { id: parsedId.data },
    select: { id: true, package_size_id: true },
  });
  if (!existing) return;

  await prisma.$transaction(async (tx) => {
    await tx.packageSizeItems.delete({ where: { id: parsedId.data } });
    await logActivity(
      tx,
      user.id,
      "PackageSizeItems",
      parsedId.data,
      "DELETE",
      { package_size_id: existing.package_size_id },
    );
  });

  revalidatePackagingPaths();
}
