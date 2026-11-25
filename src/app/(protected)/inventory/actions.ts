"use server";

import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import { priceSchema, uuidSchema } from "@/lib/schemas";
import { planStockAdjustment } from "./inventory-rules";

const adjustmentSchema = z.object({
  variant_id: uuidSchema,
  direction: z.enum(["IN", "OUT"]),
  qty_change: z.preprocess(
    (value) => Number(value),
    z
      .number()
      .finite("Selisih stok tidak valid.")
      .positive("Jumlah penyesuaian harus lebih dari 0"),
  ),
  unit_cost: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? "0" : value),
    priceSchema,
  ),
  reason: z
    .string()
    .trim()
    .min(1, "Alasan penyesuaian wajib diisi")
    .max(500, "Alasan penyesuaian terlalu panjang"),
});

function revalidateInventoryPaths(): void {
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/master/products");
}

export async function adjustStockAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = adjustmentSchema.safeParse({
      variant_id: formData.get("variant_id"),
      direction: formData.get("direction"),
      qty_change: formData.get("qty_change"),
      unit_cost: formData.get("unit_cost"),
      reason: formData.get("reason"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const user = await requireAuth();

    await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariants.findUnique({
        where: { id: parsed.data.variant_id },
        select: { id: true, name: true, stock_qty: true },
      });
      if (!variant) {
        throw new ActionError("Varian produk tidak ditemukan.");
      }

      const absoluteQty = new Prisma.Decimal(
        parsed.data.qty_change.toString(),
      );
      const qty =
        parsed.data.direction === "IN" ? absoluteQty : absoluteQty.negated();
      const batches =
        qty.lt(0)
          ? await tx.stockBatches.findMany({
              where: {
                variant_id: parsed.data.variant_id,
                remaining_qty: { gt: 0 },
              },
              orderBy: [{ received_at: "asc" }, { id: "asc" }],
              select: {
                id: true,
                received_at: true,
                remaining_qty: true,
                unit_cost: true,
              },
            })
          : [];

      const plan = planStockAdjustment(
        {
          variant_id: parsed.data.variant_id,
          qty_change: qty,
          unit_cost: parsed.data.unit_cost,
          reason: parsed.data.reason,
        },
        batches,
      );

      const adjustmentId = randomUUID();
      const referenceNumber = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${adjustmentId.slice(0, 8).toUpperCase()}`;

      if (plan.direction === "IN") {
        const batch = await tx.stockBatches.create({
          data: {
            variant_id: parsed.data.variant_id,
            source_type: "ADJUSTMENT",
            received_at: new Date(),
            initial_qty: plan.qty_change,
            remaining_qty: plan.qty_change,
            unit_cost: plan.unit_cost,
          },
        });
        const updated = await tx.productVariants.update({
          where: { id: parsed.data.variant_id },
          data: { stock_qty: { increment: plan.qty_change } },
          select: { stock_qty: true },
        });
        await tx.stockMovements.create({
          data: {
            variant_id: parsed.data.variant_id,
            batch_id: batch.id,
            stock_pool: "SELLABLE",
            movement_type: "PENYESUAIAN_STOK",
            qty_change: plan.qty_change,
            balance_after: updated.stock_qty,
            reference_type: "StockAdjustments",
            reference_id: adjustmentId,
            reference_number: referenceNumber,
            notes: plan.reason,
            created_by_id: user.id,
          },
        });
      } else {
        const outgoingQty = plan.qty_change.abs();
        const claimedVariant = await tx.productVariants.updateMany({
          where: {
            id: parsed.data.variant_id,
            stock_qty: { gte: outgoingQty },
          },
          data: { stock_qty: { decrement: outgoingQty } },
        });
        if (claimedVariant.count !== 1) {
          throw new ActionError(
            "Stok produk berubah saat penyesuaian. Silakan coba lagi.",
          );
        }

        const currentVariant = await tx.productVariants.findUnique({
          where: { id: parsed.data.variant_id },
          select: { stock_qty: true },
        });
        if (!currentVariant) {
          throw new ActionError("Varian produk tidak ditemukan.");
        }

        let balance = currentVariant.stock_qty;
        for (const allocation of plan.allocations) {
          const claimedBatch = await tx.stockBatches.updateMany({
            where: {
              id: allocation.batch_id,
              variant_id: parsed.data.variant_id,
              remaining_qty: { gte: allocation.allocated_qty },
            },
            data: { remaining_qty: { decrement: allocation.allocated_qty } },
          });
          if (claimedBatch.count !== 1) {
            throw new ActionError(
              "Stok batch berubah saat penyesuaian. Silakan coba lagi.",
            );
          }

          balance = balance.minus(allocation.allocated_qty);
          await tx.stockMovements.create({
            data: {
              variant_id: parsed.data.variant_id,
              batch_id: allocation.batch_id,
              stock_pool: "SELLABLE",
              movement_type: "PENYESUAIAN_STOK",
              qty_change: allocation.allocated_qty.negated(),
              balance_after: balance,
              reference_type: "StockAdjustments",
              reference_id: adjustmentId,
              reference_number: referenceNumber,
              notes: plan.reason,
              created_by_id: user.id,
            },
          });
        }
      }

      await logActivity(
        tx,
        user.id,
        "ProductVariants",
        variant.id,
        "ADJUST_STOCK",
        {
          qty_change: plan.qty_change.toString(),
          direction: plan.direction,
          reason: plan.reason,
        },
      );
    });

    revalidateInventoryPaths();
    return { success: "Penyesuaian stok berhasil disimpan." };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
