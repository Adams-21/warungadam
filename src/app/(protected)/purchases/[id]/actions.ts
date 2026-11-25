"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/sequence";
import { optionalTextSchema, priceSchema, uuidSchema } from "@/lib/schemas";
import {
  resolvePurchaseStatus,
  resolveSupplierPayment,
  validateReceivedQty,
  validateSupplierPayment,
} from "../purchase-rules";

const receiveItemSchema = z.object({
  purchase_item_id: uuidSchema,
  received_qty: z.preprocess(
    (value) => Number(value),
    z.number().finite().nonnegative("Jumlah diterima tidak boleh negatif"),
  ),
});

const receiveGoodsSchema = z.object({
  purchase_id: uuidSchema,
  received_at: z.date(),
  notes: optionalTextSchema,
  items: z.array(receiveItemSchema),
});

const supplierPaymentSchema = z.object({
  purchase_id: uuidSchema,
  payment_date: z.date(),
  amount: priceSchema.refine((value) => value > BigInt(0), "Nominal harus lebih dari 0"),
  payment_method: z
    .string()
    .trim()
    .min(1, "Metode pembayaran wajib diisi")
    .max(100, "Metode pembayaran terlalu panjang"),
});

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidatePurchasePaths(purchaseId: string) {
  revalidatePath("/purchases");
  revalidatePath(`/purchases/${purchaseId}`);
  revalidatePath("/dashboard");
}

export async function receiveGoodsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const itemIds = formData.getAll("purchase_item_id");
    const receivedQtys = formData.getAll("received_qty");

    const parsed = receiveGoodsSchema.safeParse({
      purchase_id: formData.get("purchase_id"),
      received_at: parseDateInput(formData.get("received_at")),
      notes: formData.get("notes"),
      items: itemIds.map((purchaseItemId, index) => ({
        purchase_item_id: purchaseItemId,
        received_qty: receivedQtys[index],
      })),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const rows = parsed.data.items.filter((item) => item.received_qty > 0);
    if (rows.length === 0) {
      return { error: "Minimal satu jumlah penerimaan harus lebih dari 0." };
    }
    if (new Set(rows.map((item) => item.purchase_item_id)).size !== rows.length) {
      return { error: "Item penerimaan tidak boleh duplikat." };
    }

    const user = await requireAuth();

    const receipt = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchases.findUnique({
        where: { id: parsed.data.purchase_id },
        select: {
          status: true,
          items: {
            select: {
              id: true,
              variant_id: true,
              ordered_qty: true,
              received_qty: true,
              unit_price: true,
            },
          },
        },
      });

      if (!purchase) {
        throw new ActionError("Pesanan pembelian tidak ditemukan.");
      }
      if (
        purchase.status === "Dibatalkan" ||
        purchase.status === "Diterima_seluruhnya"
      ) {
        throw new ActionError(
          "Pesanan ini tidak dapat menerima barang lagi.",
        );
      }

      const itemMap = new Map(purchase.items.map((item) => [item.id, item]));
      const receiptNumber = await generateDocumentNumber("RECEIPT", tx);
      const createdReceipt = await tx.goodsReceipts.create({
        data: {
          receipt_number: receiptNumber,
          purchase_id: parsed.data.purchase_id,
          received_at: parsed.data.received_at,
          notes: parsed.data.notes,
          created_by_id: user.id,
        },
        select: { id: true, receipt_number: true },
      });

      for (const row of rows) {
        const purchaseItem = itemMap.get(row.purchase_item_id);
        if (!purchaseItem) {
          throw new ActionError("Salah satu item tidak ditemukan dalam pesanan.");
        }

        const qty = new Prisma.Decimal(row.received_qty.toString());
        const receiptError = validateReceivedQty(
          purchaseItem.ordered_qty,
          purchaseItem.received_qty,
          qty,
        );
        if (receiptError) {
          throw new ActionError(receiptError);
        }

        const receiptItem = await tx.goodsReceiptItems.create({
          data: {
            goods_receipt_id: createdReceipt.id,
            purchase_item_id: purchaseItem.id,
            variant_id: purchaseItem.variant_id,
            received_qty: qty,
          },
          select: { id: true },
        });

        const batch = await tx.stockBatches.create({
          data: {
            variant_id: purchaseItem.variant_id,
            source_type: "PURCHASE_RECEIPT",
            goods_receipt_item_id: receiptItem.id,
            received_at: parsed.data.received_at,
            initial_qty: qty,
            remaining_qty: qty,
            unit_cost: purchaseItem.unit_price,
          },
          select: { id: true },
        });

        const updatedVariant = await tx.productVariants.update({
          where: { id: purchaseItem.variant_id },
          data: { stock_qty: { increment: qty } },
          select: { stock_qty: true },
        });

        await tx.stockMovements.create({
          data: {
            variant_id: purchaseItem.variant_id,
            batch_id: batch.id,
            stock_pool: "SELLABLE",
            movement_type: "PENERIMAAN_PEMBELIAN",
            qty_change: qty,
            balance_after: updatedVariant.stock_qty,
            reference_type: "GoodsReceipts",
            reference_id: createdReceipt.id,
            reference_number: createdReceipt.receipt_number,
            notes: parsed.data.notes,
            created_by_id: user.id,
          },
        });

        await tx.purchaseItems.update({
          where: { id: purchaseItem.id },
          data: { received_qty: { increment: qty } },
        });
      }

      const allItems = await tx.purchaseItems.findMany({
        where: { purchase_id: parsed.data.purchase_id },
        select: { ordered_qty: true, received_qty: true },
      });
      const status = resolvePurchaseStatus(allItems);

      await tx.purchases.update({
        where: { id: parsed.data.purchase_id },
        data: { status },
      });

      await logActivity(
        tx,
        user.id,
        "GoodsReceipts",
        createdReceipt.id,
        "CREATE",
        {
          receipt_number: createdReceipt.receipt_number,
          purchase_id: parsed.data.purchase_id,
        },
      );

      return createdReceipt;
    });

    revalidatePurchasePaths(parsed.data.purchase_id);
    return {
      success: `Penerimaan ${receipt.receipt_number} berhasil dicatat.`,
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function recordSupplierPaymentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = supplierPaymentSchema.safeParse({
      purchase_id: formData.get("purchase_id"),
      payment_date: parseDateInput(formData.get("payment_date")),
      amount: String(formData.get("amount") ?? ""),
      payment_method: formData.get("payment_method"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const user = await requireAuth();

    const payment = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchases.findUnique({
        where: { id: parsed.data.purchase_id },
        select: {
          status: true,
          paid_amount: true,
          remaining_amount: true,
        },
      });

      if (!purchase) {
        throw new ActionError("Pesanan pembelian tidak ditemukan.");
      }
      if (purchase.status === "Dibatalkan") {
        throw new ActionError("Pesanan dibatalkan tidak dapat dibayar.");
      }

      const paymentError = validateSupplierPayment(
        purchase,
        parsed.data.amount,
      );
      if (paymentError) {
        throw new ActionError(paymentError);
      }
      const nextPayment = resolveSupplierPayment(purchase, parsed.data.amount);

      const created = await tx.supplierPayments.create({
        data: {
          purchase_id: parsed.data.purchase_id,
          payment_date: parsed.data.payment_date,
          amount: parsed.data.amount,
          payment_method: parsed.data.payment_method,
          created_by_id: user.id,
        },
        select: { id: true },
      });

      await tx.purchases.update({
        where: { id: parsed.data.purchase_id },
        data: {
          paid_amount: nextPayment.paid_amount,
          remaining_amount: nextPayment.remaining_amount,
          payment_status: nextPayment.payment_status,
        },
      });

      await logActivity(
        tx,
        user.id,
        "SupplierPayments",
        created.id,
        "CREATE",
        {
          purchase_id: parsed.data.purchase_id,
          amount: parsed.data.amount.toString(),
          payment_method: parsed.data.payment_method,
        },
      );

      return created;
    });

    revalidatePurchasePaths(parsed.data.purchase_id);
    return {
      success: `Pembayaran ${payment.id.slice(0, 8)} berhasil dicatat.`,
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
