"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import type { ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/activity";
import { requireAuth } from "@/lib/auth";
import { parseStrictDateInput } from "@/lib/date-range";
import { getErrorMessage } from "@/lib/error-handler";
import { generateDocumentNumber } from "@/lib/sequence";
import { prisma } from "@/lib/prisma";
import {
  optionalTextSchema,
  positiveDecimalSchema,
  priceSchema,
  uuidSchema,
} from "@/lib/schemas";
import {
  calculatePurchaseTotal,
  validatePurchaseDueDate,
  validatePurchaseLines,
} from "./purchase-rules";
import { PAYMENT_TYPES } from "./types";

const purchaseItemSchema = z.object({
  variant_id: uuidSchema,
  ordered_qty: positiveDecimalSchema,
  unit_price: priceSchema,
});

const createPurchaseSchema = z
  .object({
    supplier_id: uuidSchema,
    purchase_date: z.date(),
    payment_type: z.enum(PAYMENT_TYPES),
    due_date: z.date().nullable(),
    notes: optionalTextSchema,
    items: z.array(purchaseItemSchema).min(1, "Minimal satu item wajib diisi"),
  })
  .superRefine((value, ctx) => {
    const error = validatePurchaseDueDate(value.payment_type, value.due_date);
    if (error) {
      ctx.addIssue({ code: "custom", message: error, path: ["due_date"] });
    }
  });

const REVALIDATE_PATHS = ["/purchases", "/dashboard"];

function parseFormDate(value: FormDataEntryValue | null): Date | null {
  return typeof value === "string" ? parseStrictDateInput(value) : null;
}

export async function createPurchaseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let createdPurchaseId: string | null = null;

  try {
    const variantIds = formData.getAll("variant_id");
    const orderedQtys = formData.getAll("ordered_qty");
    const unitPrices = formData.getAll("unit_price");

    const parsed = createPurchaseSchema.safeParse({
      supplier_id: formData.get("supplier_id"),
      purchase_date: parseFormDate(formData.get("purchase_date")),
      payment_type: formData.get("payment_type"),
      due_date: parseFormDate(formData.get("due_date")),
      notes: formData.get("notes"),
      items: variantIds.map((variantId, index) => ({
        variant_id: variantId,
        ordered_qty: orderedQtys[index],
        unit_price: unitPrices[index],
      })),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const itemIds = parsed.data.items.map((item) => item.variant_id);
    const lineError = validatePurchaseLines(parsed.data.items);
    if (lineError) {
      return { error: lineError };
    }

    const user = await requireAuth();

    const [supplier, variants] = await Promise.all([
      prisma.suppliers.findFirst({
        where: { id: parsed.data.supplier_id, is_active: true },
        select: { id: true },
      }),
      prisma.productVariants.findMany({
        where: { id: { in: itemIds }, is_active: true },
        select: { id: true },
      }),
    ]);

    if (!supplier) {
      throw new ActionError("Supplier tidak ditemukan atau tidak aktif.");
    }
    if (variants.length !== itemIds.length) {
      throw new ActionError("Sebagian varian tidak ditemukan atau tidak aktif.");
    }

    const totalAmount = calculatePurchaseTotal(parsed.data.items);
    const dueDate =
      parsed.data.payment_type === "TEMPO" ? parsed.data.due_date : null;

    const purchase = await prisma.$transaction(async (tx) => {
      const purchaseNumber = await generateDocumentNumber("PURCHASE", tx);
      const created = await tx.purchases.create({
        data: {
          purchase_number: purchaseNumber,
          supplier_id: parsed.data.supplier_id,
          purchase_date: parsed.data.purchase_date,
          payment_type: parsed.data.payment_type,
          due_date: dueDate,
          total_amount: totalAmount,
          remaining_amount: totalAmount,
          status: "Dikonfirmasi",
          payment_status: "Belum_dibayar",
          notes: parsed.data.notes,
          created_by_id: user.id,
          items: {
            create: parsed.data.items.map((item) => ({
              variant_id: item.variant_id,
              ordered_qty: new Prisma.Decimal(item.ordered_qty.toString()),
              unit_price: item.unit_price,
            })),
          },
        },
        select: { id: true, purchase_number: true },
      });

      await logActivity(
        tx,
        user.id,
        "Purchases",
        created.id,
        "CREATE",
        {
          purchase_number: created.purchase_number,
          total_amount: totalAmount.toString(),
        },
      );

      return created;
    });

    createdPurchaseId = purchase.id;
    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }
  } catch (error) {
    return { error: getErrorMessage(error) };
  }

  if (!createdPurchaseId) {
    return { error: "Gagal menyimpan pesanan pembelian." };
  }
  redirect(`/purchases/${createdPurchaseId}`);
}
