"use server";

import {
  Prisma,
  ReturnClaimStatus,
  ReturnCondition,
  ReturnFundStatus,
  ReturnStatusGroup,
} from "@prisma/client";
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
import {
  calculateCustomerReturnRefund,
  planCustomerReturnRestorations,
  type CustomerReturnAllocation,
} from "./customer-return-rules";

const moneyInputSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? "0" : value),
  priceSchema,
);

const returnItemSchema = z.object({
  sale_item_id: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    uuidSchema.nullable(),
  ),
  variant_id: uuidSchema,
  qty: z.preprocess(
    (value) => Number(value),
    z.number().finite().positive("Jumlah retur harus lebih dari 0"),
  ),
  condition: z.nativeEnum(ReturnCondition),
  unit_cost: moneyInputSchema,
});

const createCustomerReturnSchema = z.object({
  original_sale_id: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    uuidSchema.nullable(),
  ),
  return_date: z.date(),
  reason: z
    .string()
    .trim()
    .min(1, "Alasan retur wajib diisi")
    .max(500, "Alasan retur terlalu panjang"),
  items: z.array(returnItemSchema).min(1, "Minimal satu barang retur wajib diisi"),
});

const claimStatusSchema = z.object({
  id: uuidSchema,
  status: z.nativeEnum(ReturnClaimStatus),
  notes: z.string().trim().max(500, "Catatan terlalu panjang").optional(),
});

const fundStatusSchema = z.object({
  id: uuidSchema,
  status: z.nativeEnum(ReturnFundStatus),
  paid_date: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.string().nullable(),
  ),
  notes: z.string().trim().max(500, "Catatan terlalu panjang").optional(),
});

function revalidateCustomerReturnPaths(): void {
  revalidatePath("/customer-returns");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/sales");
}

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createCustomerReturnAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const saleItemIds = formData.getAll("sale_item_id");
    const variantIds = formData.getAll("variant_id");
    const quantities = formData.getAll("qty");
    const conditions = formData.getAll("condition");
    const unitCosts = formData.getAll("unit_cost");

    const parsed = createCustomerReturnSchema.safeParse({
      original_sale_id: formData.get("original_sale_id"),
      return_date: parseDateInput(formData.get("return_date")),
      reason: formData.get("reason"),
      items: variantIds
        .map((variantId, index) => ({
          sale_item_id: saleItemIds[index] ?? null,
          variant_id: variantId,
          qty: quantities[index] ?? null,
          condition: conditions[index] ?? null,
          unit_cost: unitCosts[index] ?? "0",
        }))
        .filter(
          (item) =>
            typeof item.variant_id === "string" &&
            item.variant_id.trim() !== "" &&
            Number(item.qty) > 0,
        ),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const user = await requireAuth();

    const created = await prisma.$transaction(async (tx) => {
      let allocations: CustomerReturnAllocation[] = [];
      let refundContext = {
        sale_discount_amount: BigInt(0),
        items: [] as Array<{
          sale_item_id: string;
          qty: Prisma.Decimal;
          subtotal_amount: bigint;
        }>,
      };
      let saleItems: Array<{ id: string }> = [];

      if (parsed.data.original_sale_id) {
        const sale = await tx.sales.findUnique({
          where: { id: parsed.data.original_sale_id },
          select: {
            id: true,
            order_status: true,
            discount_amount: true,
            items: {
              select: {
                id: true,
                qty: true,
                subtotal_amount: true,
                batch_allocations: {
                  select: {
                    id: true,
                    batch_id: true,
                    allocated_qty: true,
                    reversed_qty: true,
                    batch_unit_cost: true,
                    batch: { select: { received_at: true } },
                  },
                },
              },
            },
          },
        });

        if (!sale) {
          throw new ActionError("Transaksi penjualan asal tidak ditemukan.");
        }
        if (sale.order_status !== "Selesai") {
          throw new ActionError(
            "Retur hanya dapat dibuat dari transaksi yang sudah selesai.",
          );
        }

        saleItems = sale.items;
        allocations = sale.items.flatMap((item) =>
          item.batch_allocations.map((allocation) => ({
            id: allocation.id,
            sale_item_id: item.id,
            batch_id: allocation.batch_id,
            received_at: allocation.batch.received_at,
            allocated_qty: allocation.allocated_qty,
            reversed_qty: allocation.reversed_qty,
            batch_unit_cost: allocation.batch_unit_cost,
          })),
        );
        refundContext = {
          sale_discount_amount: sale.discount_amount,
          items: sale.items.map((item) => ({
            sale_item_id: item.id,
            qty: item.qty,
            subtotal_amount: item.subtotal_amount,
          })),
        };

        for (const item of parsed.data.items) {
          if (!item.sale_item_id || !saleItems.some((row) => row.id === item.sale_item_id)) {
            throw new ActionError(
              "Semua barang retur harus berasal dari transaksi yang dipilih.",
            );
          }
        }
      } else if (parsed.data.items.some((item) => item.sale_item_id)) {
        throw new ActionError(
          "Retur tanpa transaksi asal tidak boleh memiliki item transaksi.",
        );
      }

      const plan = planCustomerReturnRestorations(parsed.data.items, allocations);
      const refundAmount = parsed.data.original_sale_id
        ? calculateCustomerReturnRefund(
            parsed.data.items
              .filter((item) => item.sale_item_id)
              .map((item) => ({
                sale_item_id: item.sale_item_id as string,
                qty: item.qty,
              })),
            refundContext,
          )
        : BigInt(0);

      const returnNumber = await generateDocumentNumber("CUSTOMER_RETURN", tx);
      const header = await tx.customerReturns.create({
        data: {
          return_number: returnNumber,
          original_sale_id: parsed.data.original_sale_id,
          return_date: parsed.data.return_date,
          reason: parsed.data.reason,
          claim_status: ReturnClaimStatus.Disetujui,
          fund_status: ReturnFundStatus.Belum_diproses,
          refund_amount: refundAmount,
          created_by_id: user.id,
        },
      });

      await tx.customerReturnStatusHistories.createMany({
        data: [
          {
            customer_return_id: header.id,
            status_group: ReturnStatusGroup.CLAIM,
            old_status: ReturnClaimStatus.Belum_diajukan,
            new_status: ReturnClaimStatus.Disetujui,
            notes: parsed.data.reason,
            created_by_id: user.id,
          },
          {
            customer_return_id: header.id,
            status_group: ReturnStatusGroup.FUND,
            old_status: ReturnFundStatus.Belum_diproses,
            new_status: ReturnFundStatus.Belum_diproses,
            notes: "Menunggu proses dana retur",
            created_by_id: user.id,
          },
        ],
      });

      const variantIdsInItems = [...new Set(parsed.data.items.map((item) => item.variant_id))];
      const variants = await tx.productVariants.findMany({
        where: { id: { in: variantIdsInItems } },
        select: { id: true, name: true, stock_qty: true, damaged_stock_qty: true },
      });
      if (variants.length !== variantIdsInItems.length) {
        throw new ActionError("Sebagian varian barang retur tidak ditemukan.");
      }
      const variantBalances = new Map(
        variants.map((variant) => [
          variant.id,
          { stock_qty: variant.stock_qty, damaged_stock_qty: variant.damaged_stock_qty },
        ]),
      );

      for (const planItem of plan) {
        const returnItem = await tx.customerReturnItems.create({
          data: {
            customer_return_id: header.id,
            sale_item_id: planItem.item.sale_item_id,
            variant_id: planItem.item.variant_id,
            qty: planItem.qty,
            condition: planItem.condition,
            restored_hpp_amount: planItem.restored_hpp,
          },
        });

        const balance = variantBalances.get(planItem.item.variant_id);
        if (!balance) {
          throw new ActionError("Varian barang retur tidak ditemukan.");
        }

        if (
          planItem.condition === ReturnCondition.Layak_jual &&
          planItem.item.sale_item_id
        ) {
          let restoredQty = new Prisma.Decimal(0);
          for (const restoration of planItem.batch_restorations) {
            await tx.stockBatches.update({
              where: { id: restoration.batch_id },
              data: { remaining_qty: { increment: restoration.qty } },
            });
            await tx.saleItemBatchAllocations.update({
              where: { id: restoration.allocation_id },
              data: { reversed_qty: { increment: restoration.qty } },
            });
            await tx.saleItemBatchAllocationReversals.create({
              data: {
                allocation_id: restoration.allocation_id,
                reversal_type: "CUSTOMER_RETURN",
                reversed_qty: restoration.qty,
                customer_return_item_id: returnItem.id,
                created_by_id: user.id,
              },
            });

            const nextBalance = balance.stock_qty.plus(restoration.qty);
            balance.stock_qty = nextBalance;
            restoredQty = restoredQty.plus(restoration.qty);
            await tx.stockMovements.create({
              data: {
                variant_id: planItem.item.variant_id,
                batch_id: restoration.batch_id,
                stock_pool: "SELLABLE",
                movement_type: "RETUR_LAYAK_JUAL",
                qty_change: restoration.qty,
                balance_after: nextBalance,
                reference_type: "CustomerReturns",
                reference_id: header.id,
                reference_number: returnNumber,
                notes: parsed.data.reason,
                created_by_id: user.id,
              },
            });
          }
          if (restoredQty.gt(0)) {
            await tx.productVariants.update({
              where: { id: planItem.item.variant_id },
              data: { stock_qty: { increment: restoredQty } },
            });
          }
        } else if (planItem.condition === ReturnCondition.Layak_jual) {
          const newBatch = await tx.stockBatches.create({
            data: {
              variant_id: planItem.item.variant_id,
              source_type: "RETUR_TANPA_REFERENSI",
              received_at: new Date(),
              initial_qty: planItem.qty,
              remaining_qty: planItem.qty,
              unit_cost: planItem.new_batch_unit_cost ?? BigInt(0),
            },
          });
          const nextBalance = balance.stock_qty.plus(planItem.qty);
          await tx.productVariants.update({
            where: { id: planItem.item.variant_id },
            data: { stock_qty: { increment: planItem.qty } },
          });
          await tx.stockMovements.create({
            data: {
              variant_id: planItem.item.variant_id,
              batch_id: newBatch.id,
              stock_pool: "SELLABLE",
              movement_type: "RETUR_LAYAK_JUAL",
              qty_change: planItem.qty,
              balance_after: nextBalance,
              reference_type: "CustomerReturns",
              reference_id: header.id,
              reference_number: returnNumber,
              notes: parsed.data.reason,
              created_by_id: user.id,
            },
          });
        } else {
          const nextBalance = balance.damaged_stock_qty.plus(planItem.qty);
          balance.damaged_stock_qty = nextBalance;
          await tx.productVariants.update({
            where: { id: planItem.item.variant_id },
            data: { damaged_stock_qty: { increment: planItem.qty } },
          });
          await tx.stockMovements.create({
            data: {
              variant_id: planItem.item.variant_id,
              batch_id: null,
              stock_pool: "DAMAGED",
              movement_type: "RETUR_RUSAK",
              qty_change: planItem.qty,
              balance_after: nextBalance,
              reference_type: "CustomerReturns",
              reference_id: header.id,
              reference_number: returnNumber,
              notes: parsed.data.reason,
              created_by_id: user.id,
            },
          });
        }
      }

      await logActivity(tx, user.id, "CustomerReturns", header.id, "CREATE", {
        return_number: returnNumber,
        refund_amount: refundAmount.toString(),
        reason: parsed.data.reason,
      });

      return header;
    });

    revalidateCustomerReturnPaths();
    return { success: `Retur ${created.return_number} berhasil dicatat.` };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function updateCustomerReturnClaimStatusAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = claimStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const user = await requireAuth();

    await prisma.$transaction(async (tx) => {
      const current = await tx.customerReturns.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, claim_status: true },
      });
      if (!current) throw new ActionError("Data retur tidak ditemukan.");

      await tx.customerReturns.update({
        where: { id: parsed.data.id },
        data: { claim_status: parsed.data.status },
      });
      await tx.customerReturnStatusHistories.create({
        data: {
          customer_return_id: parsed.data.id,
          status_group: ReturnStatusGroup.CLAIM,
          old_status: current.claim_status,
          new_status: parsed.data.status,
          notes: parsed.data.notes ?? null,
          created_by_id: user.id,
        },
      });
      await logActivity(
        tx,
        user.id,
        "CustomerReturns",
        parsed.data.id,
        "UPDATE_CLAIM",
        { status: parsed.data.status },
      );
    });

    revalidateCustomerReturnPaths();
    return { success: "Status klaim retur diperbarui." };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function updateCustomerReturnFundStatusAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = fundStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      paid_date: formData.get("paid_date"),
      notes: formData.get("notes") ?? undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    let paidDate: Date | null = null;
    if (parsed.data.paid_date) {
      paidDate = parseDateInput(parsed.data.paid_date);
      if (!paidDate) return { error: "Tanggal pengembalian dana tidak valid." };
    }

    const user = await requireAuth();

    await prisma.$transaction(async (tx) => {
      const current = await tx.customerReturns.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, fund_status: true, refund_amount: true },
      });
      if (!current) throw new ActionError("Data retur tidak ditemukan.");

      if (
        parsed.data.status === ReturnFundStatus.Dana_dikembalikan &&
        current.refund_amount > BigInt(0) &&
        !paidDate
      ) {
        throw new ActionError("Tanggal pengembalian dana wajib diisi.");
      }

      await tx.customerReturns.update({
        where: { id: parsed.data.id },
        data: {
          fund_status: parsed.data.status,
          refund_paid_date:
            parsed.data.status === ReturnFundStatus.Dana_dikembalikan
              ? paidDate
              : null,
        },
      });
      await tx.customerReturnStatusHistories.create({
        data: {
          customer_return_id: parsed.data.id,
          status_group: ReturnStatusGroup.FUND,
          old_status: current.fund_status,
          new_status: parsed.data.status,
          notes: parsed.data.notes ?? null,
          created_by_id: user.id,
        },
      });
      await logActivity(
        tx,
        user.id,
        "CustomerReturns",
        parsed.data.id,
        "UPDATE_FUND",
        { status: parsed.data.status },
      );
    });

    revalidateCustomerReturnPaths();
    return { success: "Status dana retur diperbarui." };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
