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
import { generateDocumentNumber } from "@/lib/sequence";
import { optionalTextSchema, priceSchema, uuidSchema } from "@/lib/schemas";
import {
  resolvePurchaseStatus,
  resolveSupplierPaymentTotals,
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

const voidSupplierPaymentSchema = z.object({
  purchase_id: uuidSchema,
  payment_id: uuidSchema,
  void_reason: z
    .string()
    .trim()
    .min(1, "Alasan pembatalan wajib diisi")
    .max(500, "Alasan pembatalan terlalu panjang"),
});

function parseFormDate(value: FormDataEntryValue | null): Date | null {
  return typeof value === "string" ? parseStrictDateInput(value) : null;
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
      received_at: parseFormDate(formData.get("received_at")),
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

      const claimedPurchase = await tx.purchases.updateMany({
        where: {
          id: parsed.data.purchase_id,
          status: { notIn: ["Dibatalkan", "Diterima_seluruhnya"] },
        },
        data: { status: "Diterima_sebagian" },
      });
      if (claimedPurchase.count !== 1) {
        throw new ActionError(
          "Status pesanan berubah. Silakan muat ulang dan coba lagi.",
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

        const claimedItem = await tx.purchaseItems.updateMany({
          where: {
            id: purchaseItem.id,
            purchase_id: parsed.data.purchase_id,
            received_qty: { lte: purchaseItem.ordered_qty.minus(qty) },
          },
          data: { received_qty: { increment: qty } },
        });
        if (claimedItem.count !== 1) {
          throw new ActionError(
            "Jumlah penerimaan berubah. Silakan muat ulang dan coba lagi.",
          );
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
      }

      const allItems = await tx.purchaseItems.findMany({
        where: { purchase_id: parsed.data.purchase_id },
        select: { ordered_qty: true, received_qty: true },
      });
      const status = resolvePurchaseStatus(allItems);

      const updatedPurchase = await tx.purchases.updateMany({
        where: {
          id: parsed.data.purchase_id,
          status: { notIn: ["Dibatalkan", "Diterima_seluruhnya"] },
        },
        data: { status },
      });
      if (updatedPurchase.count !== 1) {
        throw new ActionError(
          "Status pesanan berubah. Silakan muat ulang dan coba lagi.",
        );
      }

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
      payment_date: parseFormDate(formData.get("payment_date")),
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
          total_amount: true,
          paid_amount: true,
          remaining_amount: true,
          payment_status: true,
        },
      });

      if (!purchase) {
        throw new ActionError("Pesanan pembelian tidak ditemukan.");
      }
      if (purchase.status === "Dibatalkan") {
        throw new ActionError("Pesanan dibatalkan tidak dapat dibayar.");
      }

      const beforePayment = await tx.supplierPayments.aggregate({
        where: { purchase_id: parsed.data.purchase_id, is_void: false },
        _sum: { amount: true },
      });
      const beforeTotals = resolveSupplierPaymentTotals(
        purchase.total_amount,
        beforePayment._sum.amount,
      );
      const paymentError = validateSupplierPayment(
        beforeTotals,
        parsed.data.amount,
      );
      if (paymentError) {
        throw new ActionError(paymentError);
      }

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

      const afterPayment = await tx.supplierPayments.aggregate({
        where: { purchase_id: parsed.data.purchase_id, is_void: false },
        _sum: { amount: true },
      });
      const afterTotals = resolveSupplierPaymentTotals(
        purchase.total_amount,
        afterPayment._sum.amount,
      );

      const updatedPurchase = await tx.purchases.updateMany({
        where: {
          id: parsed.data.purchase_id,
          status: { not: "Dibatalkan" },
          paid_amount: purchase.paid_amount,
          remaining_amount: purchase.remaining_amount,
          payment_status: purchase.payment_status,
        },
        data: afterTotals,
      });
      if (updatedPurchase.count !== 1) {
        throw new ActionError(
          "Data pembayaran berubah. Silakan muat ulang dan coba lagi.",
        );
      }

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

export async function voidSupplierPaymentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = voidSupplierPaymentSchema.safeParse({
      purchase_id: formData.get("purchase_id"),
      payment_id: formData.get("payment_id"),
      void_reason: formData.get("void_reason"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const user = await requireAuth();
    const { purchase_id: purchaseId, payment_id: paymentId } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchases.findUnique({
        where: { id: purchaseId },
        select: {
          status: true,
          total_amount: true,
          paid_amount: true,
          remaining_amount: true,
          payment_status: true,
        },
      });

      if (!purchase) {
        throw new ActionError("Pesanan pembelian tidak ditemukan.");
      }
      if (purchase.status === "Dibatalkan") {
        throw new ActionError(
          "Pembayaran pesanan dibatalkan tidak dapat diubah.",
        );
      }

      const voidedPayment = await tx.supplierPayments.updateMany({
        where: { id: paymentId, purchase_id: purchaseId, is_void: false },
        data: {
          is_void: true,
          void_reason: parsed.data.void_reason,
          voided_by_id: user.id,
        },
      });
      if (voidedPayment.count !== 1) {
        throw new ActionError(
          "Pembayaran tidak ditemukan atau sudah dibatalkan.",
        );
      }

      const remainingPayments = await tx.supplierPayments.aggregate({
        where: { purchase_id: purchaseId, is_void: false },
        _sum: { amount: true },
      });
      const totals = resolveSupplierPaymentTotals(
        purchase.total_amount,
        remainingPayments._sum.amount,
      );

      const updatedPurchase = await tx.purchases.updateMany({
        where: {
          id: purchaseId,
          status: { not: "Dibatalkan" },
          paid_amount: purchase.paid_amount,
          remaining_amount: purchase.remaining_amount,
          payment_status: purchase.payment_status,
        },
        data: totals,
      });
      if (updatedPurchase.count !== 1) {
        throw new ActionError(
          "Data pembayaran berubah. Silakan muat ulang dan coba lagi.",
        );
      }

      await logActivity(tx, user.id, "SupplierPayments", paymentId, "VOID", {
        purchase_id: purchaseId,
        void_reason: parsed.data.void_reason,
      });
    });

    revalidatePurchasePaths(purchaseId);
    return { success: "Pembayaran berhasil dibatalkan." };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
