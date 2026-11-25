"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { parseStrictDateInput } from "@/lib/date-range";
import { getErrorMessage } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import {
  optionalTextSchema,
  positiveDecimalSchema,
  priceSchema,
  uuidSchema,
} from "@/lib/schemas";
import { generateDocumentNumber } from "@/lib/sequence";
import {
  calculateItemSubtotal,
  calculateWeightedAverageUnitCost,
  convertPurchaseToUsageQty,
} from "../purchase-rules";

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

function parseFormDate(value: FormDataEntryValue | null): Date | null {
  return typeof value === "string" ? parseStrictDateInput(value) : null;
}

export async function createPackagingPurchaseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const materialIds = formData.getAll("packaging_material_id");
    const purchaseQtys = formData.getAll("purchase_qty");
    const unitPrices = formData.getAll("unit_price");

    const parsed = createPackagingPurchaseSchema.safeParse({
      purchase_date: parseFormDate(formData.get("purchase_date")),
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

    const purchase = await prisma.$transaction(async (tx) => {
      const materials = await tx.packagingMaterials.findMany({
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

      const materialMap = new Map(
        materials.map((material) => [material.id, material]),
      );
      const lines = parsed.data.items.map((item) => {
        const material = materialMap.get(item.packaging_material_id);
        if (!material) {
          throw new ActionError("Material tidak ditemukan.");
        }

        const purchaseQty = new Prisma.Decimal(item.purchase_qty.toString());
        const usageQty = convertPurchaseToUsageQty(
          purchaseQty,
          material.conversion_factor,
        );
        const subtotal = calculateItemSubtotal({
          ordered_qty: purchaseQty,
          unit_price: item.unit_price,
        });
        const nextAverage = calculateWeightedAverageUnitCost({
          currentStock: material.stock_qty,
          currentAverageCost: material.average_unit_cost,
          purchaseSubtotal: subtotal,
          usageQty,
        });

        return {
          materialId: material.id,
          currentStock: material.stock_qty,
          currentAverageCost: material.average_unit_cost,
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

        const claimedMaterial = await tx.packagingMaterials.updateMany({
          where: {
            id: line.materialId,
            stock_qty: line.currentStock,
            average_unit_cost: line.currentAverageCost,
          },
          data: {
            stock_qty: { increment: line.usageQty },
            average_unit_cost: line.nextAverage,
          },
        });
        if (claimedMaterial.count !== 1) {
          throw new ActionError(
            "Stok kemasan berubah saat transaksi. Silakan coba lagi.",
          );
        }

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
    return { error: getErrorMessage(error) };
  }
}
