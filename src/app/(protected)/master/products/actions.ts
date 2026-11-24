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
  priceSchema,
  uuidSchema,
} from "@/lib/schemas";
import {
  getBlockingRelations,
  isPositivePrice,
} from "../master-data-rules";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(100),
});

const productSchema = z.object({
  name: z.string().trim().min(1, "Nama produk wajib diisi").max(150),
  category_id: uuidSchema,
  description: optionalTextSchema,
});

const variantSchema = z.object({
  product_id: uuidSchema,
  unit_id: uuidSchema,
  name: z.string().trim().min(1, "Nama varian wajib diisi").max(150),
  barcode: optionalTextSchema,
  default_selling_price: priceSchema.refine(
    (value) => isPositivePrice(value),
    "Harga jual harus lebih dari 0",
  ),
  min_stock: nullableDecimalSchema,
});

const channelPriceSchema = z.object({
  variant_id: uuidSchema,
  sales_channel_id: uuidSchema,
  selling_price: priceSchema.refine(
    (value) => isPositivePrice(value),
    "Harga jual harus lebih dari 0",
  ),
});

const supplierPriceSchema = z.object({
  variant_id: uuidSchema,
  supplier_id: uuidSchema,
  purchase_price: priceSchema.refine(
    (value) => isPositivePrice(value),
    "Harga beli harus lebih dari 0",
  ),
});

const MUTATION_ERROR = "Gagal menyimpan data produk.";
const REVALIDATE_PATHS = ["/master/products", "/dashboard"];

function revalidateProductPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

export async function createCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.productCategories.create({
        data: { name: parsed.data.name },
      });
      await logActivity(
        tx,
        user.id,
        "ProductCategories",
        created.id,
        "CREATE",
        { name: created.name },
      );
      return created;
    });

    revalidateProductPaths();
    return { success: `Kategori ${category.name} ditambahkan.` };
  } catch (error) {
    return toActionError(error, "Gagal menambah kategori.");
  }
}

export async function toggleCategoryActiveAction(
  formData: FormData,
): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const existing = await prisma.productCategories.findUnique({
    where: { id: parsedId.data },
    select: { is_active: true },
  });
  if (!existing) return;

  const nextValue = !existing.is_active;
  await prisma.$transaction(async (tx) => {
    await tx.productCategories.update({
      where: { id: parsedId.data },
      data: { is_active: nextValue },
    });
    await logActivity(
      tx,
      user.id,
      "ProductCategories",
      parsedId.data,
      "UPDATE",
      { is_active: nextValue },
    );
  });

  revalidateProductPaths();
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<ActionState> {
  const parsedId = uuidSchema.safeParse(categoryId);
  if (!parsedId.success) {
    return { error: "ID kategori tidak valid." };
  }

  const user = await requireAuth();
  const productCount = await prisma.products.count({
    where: { category_id: parsedId.data },
  });

  if (getBlockingRelations("CATEGORY", { products: productCount }).length > 0) {
    return {
      error: "Kategori masih digunakan produk dan tidak dapat dihapus.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productCategories.delete({ where: { id: parsedId.data } });
      await logActivity(
        tx,
        user.id,
        "ProductCategories",
        parsedId.data,
        "DELETE",
        { product_count: productCount },
      );
    });

    revalidatePath("/master/products");
    return { success: "Kategori berhasil dihapus." };
  } catch (error) {
    return toActionError(error, "Gagal menghapus kategori.");
  }
}

export async function createProductAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.products.create({
        data: {
          name: parsed.data.name,
          category_id: parsed.data.category_id,
          description: parsed.data.description,
        },
      });
      await logActivity(tx, user.id, "Products", created.id, "CREATE", {
        name: created.name,
        category_id: created.category_id,
      });
      return created;
    });

    revalidateProductPaths();
    return { success: `Produk ${product.name} ditambahkan.` };
  } catch (error) {
    return toActionError(error, MUTATION_ERROR);
  }
}

export async function toggleProductActiveAction(
  formData: FormData,
): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const existing = await prisma.products.findUnique({
    where: { id: parsedId.data },
    select: { is_active: true },
  });
  if (!existing) return;

  const nextValue = !existing.is_active;
  await prisma.$transaction(async (tx) => {
    await tx.products.update({
      where: { id: parsedId.data },
      data: { is_active: nextValue },
    });
    await logActivity(tx, user.id, "Products", parsedId.data, "UPDATE", {
      is_active: nextValue,
    });
  });

  revalidateProductPaths();
}

export async function createVariantAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = variantSchema.safeParse({
    product_id: formData.get("product_id"),
    unit_id: formData.get("unit_id"),
    name: formData.get("name"),
    barcode: formData.get("barcode"),
    default_selling_price: String(formData.get("default_selling_price") ?? ""),
    min_stock: formData.get("min_stock"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();

  try {
    const variant = await prisma.$transaction(async (tx) => {
      const created = await tx.productVariants.create({
        data: {
          product_id: parsed.data.product_id,
          unit_id: parsed.data.unit_id,
          name: parsed.data.name,
          barcode: parsed.data.barcode,
          default_selling_price: parsed.data.default_selling_price,
          min_stock: parsed.data.min_stock,
        },
      });
      await logActivity(tx, user.id, "ProductVariants", created.id, "CREATE", {
        name: created.name,
        product_id: created.product_id,
        default_selling_price: created.default_selling_price.toString(),
      });
      return created;
    });

    revalidateProductPaths();
    return { success: `Varian ${variant.name} ditambahkan.` };
  } catch (error) {
    return toActionError(error, "Gagal menambah varian.");
  }
}

export async function toggleVariantActiveAction(
  formData: FormData,
): Promise<void> {
  const parsedId = uuidSchema.safeParse(formData.get("id"));
  if (!parsedId.success) return;

  const user = await requireAuth();
  const existing = await prisma.productVariants.findUnique({
    where: { id: parsedId.data },
    select: { is_active: true },
  });
  if (!existing) return;

  const nextValue = !existing.is_active;
  await prisma.$transaction(async (tx) => {
    await tx.productVariants.update({
      where: { id: parsedId.data },
      data: { is_active: nextValue },
    });
    await logActivity(tx, user.id, "ProductVariants", parsedId.data, "UPDATE", {
      is_active: nextValue,
    });
  });

  revalidateProductPaths();
}

export async function upsertChannelPriceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = channelPriceSchema.safeParse({
    variant_id: formData.get("variant_id"),
    sales_channel_id: formData.get("sales_channel_id"),
    selling_price: String(formData.get("selling_price") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();
  const { variant_id, sales_channel_id, selling_price } = parsed.data;

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.variantChannelPrices.findUnique({
        where: {
          variant_id_sales_channel_id: { variant_id, sales_channel_id },
        },
        select: { id: true },
      });

      const result = await tx.variantChannelPrices.upsert({
        where: {
          variant_id_sales_channel_id: { variant_id, sales_channel_id },
        },
        create: { variant_id, sales_channel_id, selling_price },
        update: { selling_price },
      });

      await logActivity(
        tx,
        user.id,
        "VariantChannelPrices",
        result.id,
        existing ? "UPDATE" : "CREATE",
        {
          variant_id,
          sales_channel_id,
          selling_price: selling_price.toString(),
        },
      );

      return result;
    });

    revalidateProductPaths();
    return {
      success: `Harga kanal berhasil disimpan (${saved.id.slice(0, 8)}).`,
    };
  } catch (error) {
    return toActionError(error, "Gagal menyimpan harga kanal.");
  }
}

export async function upsertSupplierPriceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = supplierPriceSchema.safeParse({
    variant_id: formData.get("variant_id"),
    supplier_id: formData.get("supplier_id"),
    purchase_price: String(formData.get("purchase_price") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const user = await requireAuth();
  const { variant_id, supplier_id, purchase_price } = parsed.data;

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.variantSuppliers.findUnique({
        where: { variant_id_supplier_id: { variant_id, supplier_id } },
        select: { id: true },
      });

      const result = await tx.variantSuppliers.upsert({
        where: { variant_id_supplier_id: { variant_id, supplier_id } },
        create: { variant_id, supplier_id, purchase_price },
        update: { purchase_price },
      });

      await logActivity(
        tx,
        user.id,
        "VariantSuppliers",
        result.id,
        existing ? "UPDATE" : "CREATE",
        {
          variant_id,
          supplier_id,
          purchase_price: purchase_price.toString(),
        },
      );

      return result;
    });

    revalidateProductPaths();
    return {
      success: `Harga beli berhasil disimpan (${saved.id.slice(0, 8)}).`,
    };
  } catch (error) {
    return toActionError(error, "Gagal menyimpan harga beli.");
  }
}
