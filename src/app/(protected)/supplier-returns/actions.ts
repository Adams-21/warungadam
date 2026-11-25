"use server";

import { Prisma, SupplierReturnResolution } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import { priceSchema, uuidSchema } from "@/lib/schemas";
import { generateDocumentNumber } from "@/lib/sequence";
import { resolveSupplierPayment } from "../purchases/purchase-rules";
import {
  calculateSupplierReturnAmount,
  isBlankSupplierReturnAmount,
  planSupplierReturnItems,
  resolveSupplierReturnAmount,
  validateSupplierReturnAmount,
  validateSupplierReturnItems,
  type SupplierReturnItemInput,
  type SupplierReturnReceiptContext,
} from "./supplier-return-rules";

const supplierReturnItemSchema = z.object({
  goods_receipt_item_id: uuidSchema,
  batch_id: uuidSchema,
  variant_id: uuidSchema,
  qty: z.preprocess(
    (value) => Number(value),
    z.number().finite().positive("Jumlah retur harus lebih dari 0"),
  ),
  unit_price: priceSchema,
});

const createSupplierReturnSchema = z.object({
  purchase_id: uuidSchema,
  return_date: z.date(),
  resolution_type: z.nativeEnum(SupplierReturnResolution),
  return_amount: z.preprocess(
    (value) => (isBlankSupplierReturnAmount(value) ? "0" : value),
    priceSchema,
  ),
  settlement_date: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.string().nullable(),
  ),
  reason: z
    .string()
    .trim()
    .min(1, "Alasan retur wajib diisi")
    .max(500, "Alasan retur terlalu panjang"),
  items: z.array(supplierReturnItemSchema).min(1, "Minimal satu barang retur wajib diisi"),
});

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidateSupplierReturnPaths(): void {
  revalidatePath("/supplier-returns");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/purchases");
}

export async function createSupplierReturnAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const receiptItemIds = formData.getAll("goods_receipt_item_id");
    const batchIds = formData.getAll("batch_id");
    const variantIds = formData.getAll("variant_id");
    const quantities = formData.getAll("qty");
    const unitPrices = formData.getAll("unit_price");
    const rawReturnAmount = formData.get("return_amount");

    const parsed = createSupplierReturnSchema.safeParse({
      purchase_id: formData.get("purchase_id"),
      return_date: parseDateInput(formData.get("return_date")),
      resolution_type: formData.get("resolution_type"),
      return_amount: rawReturnAmount,
      settlement_date: formData.get("settlement_date"),
      reason: formData.get("reason"),
      items: receiptItemIds
        .map((receiptItemId, index) => ({
          goods_receipt_item_id: receiptItemId,
          batch_id: batchIds[index] ?? null,
          variant_id: variantIds[index] ?? null,
          qty: quantities[index] ?? null,
          unit_price: unitPrices[index] ?? "0",
        }))
        .filter(
          (item) =>
            typeof item.goods_receipt_item_id === "string" &&
            item.goods_receipt_item_id.trim() !== "" &&
            Number(item.qty) > 0,
        ),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const settlementDate = parsed.data.settlement_date
      ? parseDateInput(parsed.data.settlement_date)
      : null;
    if (parsed.data.settlement_date && !settlementDate) {
      return { error: "Tanggal realisasi retur tidak valid." };
    }

    const user = await requireAuth();

    const created = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchases.findUnique({
        where: { id: parsed.data.purchase_id },
        select: {
          id: true,
          status: true,
          paid_amount: true,
          remaining_amount: true,
          goods_receipts: {
            select: {
              items: {
                select: {
                  id: true,
                  variant_id: true,
                  received_qty: true,
                  purchase_item: { select: { unit_price: true } },
                  stock_batch: {
                    select: { id: true, remaining_qty: true, unit_cost: true },
                  },
                  supplier_return_items: { select: { qty: true } },
                },
              },
            },
          },
        },
      });

      if (!purchase) {
        throw new ActionError("Pembelian asal tidak ditemukan.");
      }

      const receiptItems = purchase.goods_receipts.flatMap(
        (receipt) => receipt.items,
      );
      const contexts: SupplierReturnReceiptContext[] = [];
      for (const row of receiptItems) {
        if (!row.stock_batch) continue;
        contexts.push({
          goods_receipt_item_id: row.id,
          batch_id: row.stock_batch.id,
          variant_id: row.variant_id,
          received_qty: row.received_qty,
          prior_returned_qty: row.supplier_return_items.reduce(
            (sum, item) => sum.plus(item.qty),
            new Prisma.Decimal(0),
          ),
          batch_remaining_qty: row.stock_batch.remaining_qty,
          unit_price: row.purchase_item.unit_price,
        });
      }

      const items: SupplierReturnItemInput[] = parsed.data.items.map((item) => ({
        goods_receipt_item_id: item.goods_receipt_item_id,
        batch_id: item.batch_id as string,
        variant_id: item.variant_id as string,
        qty: new Prisma.Decimal(item.qty.toString()),
        unit_price: item.unit_price,
      }));

      const itemError = validateSupplierReturnItems(items, contexts);
      if (itemError) throw new ActionError(itemError);

      const calculatedAmount = calculateSupplierReturnAmount(items);
      const returnAmount = resolveSupplierReturnAmount(
        rawReturnAmount,
        calculatedAmount,
      );
      const amountError = validateSupplierReturnAmount({
        calculated_amount: calculatedAmount,
        return_amount: returnAmount,
        remaining_amount: purchase.remaining_amount,
        resolution_type: parsed.data.resolution_type,
        settlement_date: settlementDate,
      });
      if (amountError) throw new ActionError(amountError);

      const plan = planSupplierReturnItems(items);
      const returnNumber = await generateDocumentNumber("SUPPLIER_RETURN", tx);
      const header = await tx.supplierReturns.create({
        data: {
          return_number: returnNumber,
          purchase_id: purchase.id,
          return_date: parsed.data.return_date,
          resolution_type: parsed.data.resolution_type,
          calculated_return_amount: calculatedAmount,
          return_amount: returnAmount,
          settlement_date: settlementDate,
          reason: parsed.data.reason,
          created_by_id: user.id,
        },
      });

      const variantIdsInItems = [...new Set(plan.map((item) => item.variant_id))];
      const variants = await tx.productVariants.findMany({
        where: { id: { in: variantIdsInItems } },
        select: { id: true, stock_qty: true },
      });
      if (variants.length !== variantIdsInItems.length) {
        throw new ActionError("Sebagian varian barang retur tidak ditemukan.");
      }
      const stockBalances = new Map(
        variants.map((variant) => [variant.id, variant.stock_qty]),
      );

      for (const item of plan) {
        await tx.supplierReturnItems.create({
          data: {
            supplier_return_id: header.id,
            goods_receipt_item_id: item.goods_receipt_item_id,
            batch_id: item.batch_id,
            variant_id: item.variant_id,
            qty: item.qty,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          },
        });

        await tx.stockBatches.update({
          where: { id: item.batch_id },
          data: { remaining_qty: { decrement: item.qty } },
        });

        const previousBalance = stockBalances.get(item.variant_id);
        if (!previousBalance) {
          throw new ActionError("Varian barang retur tidak ditemukan.");
        }
        const balanceAfterReturn = previousBalance.minus(item.qty);
        stockBalances.set(item.variant_id, balanceAfterReturn);
        await tx.productVariants.update({
          where: { id: item.variant_id },
          data: { stock_qty: { decrement: item.qty } },
        });
        await tx.stockMovements.create({
          data: {
            variant_id: item.variant_id,
            batch_id: item.batch_id,
            stock_pool: "SELLABLE",
            movement_type: "RETUR_SUPPLIER",
            qty_change: item.qty.negated(),
            balance_after: balanceAfterReturn,
            reference_type: "SupplierReturns",
            reference_id: header.id,
            reference_number: returnNumber,
            notes: parsed.data.reason,
            created_by_id: user.id,
          },
        });

        if (parsed.data.resolution_type === SupplierReturnResolution.BARANG_PENGGANTI) {
          const replacementBatch = await tx.stockBatches.create({
            data: {
              variant_id: item.variant_id,
              source_type: "SUPPLIER_REPLACEMENT",
              supplier_return_id: header.id,
              received_at: settlementDate ?? parsed.data.return_date,
              initial_qty: item.qty,
              remaining_qty: item.qty,
              unit_cost: item.unit_price,
            },
          });
          const balanceAfterReplacement = balanceAfterReturn.plus(item.qty);
          stockBalances.set(item.variant_id, balanceAfterReplacement);
          await tx.productVariants.update({
            where: { id: item.variant_id },
            data: { stock_qty: { increment: item.qty } },
          });
          await tx.stockMovements.create({
            data: {
              variant_id: item.variant_id,
              batch_id: replacementBatch.id,
              stock_pool: "SELLABLE",
              movement_type: "PENGGANTI_RETUR_SUPPLIER",
              qty_change: item.qty,
              balance_after: balanceAfterReplacement,
              reference_type: "SupplierReturns",
              reference_id: header.id,
              reference_number: returnNumber,
              notes: `Barang pengganti retur ${returnNumber}`,
              created_by_id: user.id,
            },
          });
        }
      }

      if (parsed.data.resolution_type === SupplierReturnResolution.POTONGAN_TAGIHAN) {
        const payment = resolveSupplierPayment(
          {
            paid_amount: purchase.paid_amount,
            remaining_amount: purchase.remaining_amount,
            status: purchase.status,
          },
          returnAmount,
        );
        await tx.purchases.update({
          where: { id: purchase.id },
          data: {
            paid_amount: payment.paid_amount,
            remaining_amount: payment.remaining_amount,
            payment_status: payment.payment_status,
          },
        });
      }

      await logActivity(tx, user.id, "SupplierReturns", header.id, "CREATE", {
        return_number: returnNumber,
        resolution_type: parsed.data.resolution_type,
        return_amount: returnAmount.toString(),
        reason: parsed.data.reason,
      });

      return header;
    });

    revalidateSupplierReturnPaths();
    return { success: `Retur supplier ${created.return_number} berhasil dicatat.` };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
