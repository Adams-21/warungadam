"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, toActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  optionalTextSchema,
  positiveDecimalSchema,
  priceSchema,
  uuidSchema,
} from "@/lib/schemas";
import { generateDocumentNumber } from "@/lib/sequence";

const packagingItemSchema = z.object({
  packaging_material_id: uuidSchema,
  purchase_qty: positiveDecimalSchema,
  unit_price: priceSchema,
});

const createPackagingPurchaseSchema = z.object({
  purchase_date: z.date(),
  notes: optionalTextSchema,
  items: z
    .array(packagingItemSchema)
    .min(1, "Minimal satu material wajib diisi"),
});

const REVALIDATE_PATHS = [
  "/purchases/packaging",
  "/purchases",
  "/master/packaging",
  "/dashboard",
];

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundToBigInt(value: Prisma.Decimal): bigint {
  return BigInt(value.toDecimalPlaces(0).toFixed(0));
}

export async function createPackagingPurchaseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const materialIds = formData.getAll("packaging_material_id");
  const purchaseQtys = formData.getAll("purchase_qty");
  const unitPrices = formData.getAll("unit_price");

  const parsed = createPackagingPurchaseSchema.safeParse({
    purchase_date: parseDateInput(formData.get("purchase_date")),
    notes: formData.get("notes"),
    items: materialIds.map((materialId, index) => ({
      packaging_material_id: materialId,
      purchase_qty: purchaseQtys[index],
      unit_price: unitPrices[index],
    })),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const ids = parsed.data.items.map((item) => item.packaging_material_id);
  if (new Set(ids).size !== ids.length) {
    return { error: "Material tidak boleh duplikat dalam satu pembelian." };
  }

  const user = await requireAuth();

  try {
    const materials = await prisma.packagingMaterials.findMany({
      where: { id: { in: ids }, is_active: true },
      select: {
        id: true,
        conversion_factor: true,
        stock_qty: true,
        average_unit_cost: true,
      },
    });

    if (materials.length !== ids.length) {
      throw new ActionError(
        "Sebagian material tidak ditemukan atau tidak aktif.",
      );
    }

    const materialMap = new Map(materials.map((material) => [material.id, material]));
    const lines = parsed.data.items.map((item) => {
      const material = materialMap.get(item.packaging_material_id);
      if (!material) {
        throw new ActionError("Material tidak ditemukan.");
      }

      const purchaseQty = new Prisma.Decimal(item.purchase_qty.toString());
      const conversionFactor = material.conversion_factor;
      const usageQty = purchaseQty.mul(conversionFactor);
      const unitPriceDecimal = new Prisma.Decimal(item.unit_price.toString());
      const subtotal = roundToBigInt(purchaseQty.mul(unitPriceDecimal));

      const nextStock = material.stock_qty.plus(usageQty);
      const currentValue = material.stock_qty.mul(material.average_unit_cost);
      const nextAverage = nextStock.isZero()
        ? material.average_unit_cost
        : currentValue
            .plus(new Prisma.Decimal(subtotal.toString()))
            .div(nextStock)
            .toDecimalPlaces(4);

      return {
        materialId: material.id,
        purchaseQty,
        usageQty,
        unitPrice: item.unit_price,
        subtotal,
        nextAverage,
      };
    });

    const totalAmount = lines.reduce(
      (sum, line) => sum + line.subtotal,
      BigInt(0),
    );

    const purchase = await prisma.$transaction(async (tx) => {
      const purchaseNumber = await generateDocumentNumber(
        "PACKAGING_PURCHASE",
        tx,
      );
      const created = await tx.packagingPurchases.create({
        data: {
          purchase_number: purchaseNumber,
          purchase_date: parsed.data.purchase_date,
          total_amount: totalAmount,
          notes: parsed.data.notes,
          created_by_id: user.id,
          items: {
            create: lines.map((line) => ({
              packaging_material_id: line.materialId,
              purchase_qty: line.purchaseQty,
              converted_usage_qty: line.usageQty,
              unit_price: line.unitPrice,
              subtotal: line.subtotal,
            })),
          },
        },
        select: {
          id: true,
          purchase_number: true,
          items: {
            select: { id: true, packaging_material_id: true },
          },
        },
      });

      const itemByMaterial = new Map(
        created.items.map((item) => [item.packaging_material_id, item.id]),
      );

      for (const line of lines) {
        const createdItemId = itemByMaterial.get(line.materialId);
        if (!createdItemId) {
          throw new ActionError("Item pembelian kemasan gagal dibuat.");
        }

        await tx.packagingMaterials.update({
          where: { id: line.materialId },
          data: {
            stock_qty: { increment: line.usageQty },
            average_unit_cost: line.nextAverage,
          },
        });

        await tx.packagingMovements.create({
          data: {
            packaging_material_id: line.materialId,
            movement_type: "PEMBELIAN",
            qty_change: line.usageQty,
            reference_type: "PackagingPurchases",
            reference_id: created.id,
            reference_number: created.purchase_number,
            created_by_id: user.id,
          },
        });
      }

      await logActivity(
        tx,
        user.id,
        "PackagingPurchases",
        created.id,
        "CREATE",
        {
          purchase_number: created.purchase_number,
          total_amount: totalAmount.toString(),
        },
      );

      return created;
    });

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }

    return {
      success: `Pembelian kemasan ${purchase.purchase_number} berhasil dicatat.`,
    };
  } catch (error) {
    return toActionError(error, "Gagal menyimpan pembelian kemasan.");
  }
}
