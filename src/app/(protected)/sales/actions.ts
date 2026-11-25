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
  allocateSaleItems,
  calculateAdminFeeEstimate,
  calculateSaleItemSubtotal,
  calculateSalePackagingUsage,
  calculateSaleSummary,
  planSaleVoidPackagingRestorations,
  planSaleVoidRestorations,
  validateSaleItems,
  validateSaleVoidEligibility,
  validateSaleVoidReason,
  type PackageSizeItemInput,
  type PackagingUsageOverride,
} from "./sales-rules";
import { resolveDefaultSalesChannel } from "./sales-channel-helpers";
import { resolvePackageCount } from "./sales-form-helpers";
import {
  planSaleVoidPaymentVoids,
  resolveSalePaymentStatus,
  salePaymentHistoryReason,
  saleVoidPaymentHistoryReason,
  validateSalePaidStatus,
  validateSaleSettlementStatus,
} from "./sales-payment-helpers";
import {
  SALE_PAYMENT_METHODS,
  SALE_PAYMENT_STATUS_INPUTS,
} from "./types";

const moneyInputSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? "0" : value),
  priceSchema,
);

const usageQtySchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? 0 : Number(value)),
  z.number().finite().nonnegative("Pemakaian kemasan tidak boleh negatif."),
);

const saleItemSchema = z.object({
  variant_id: uuidSchema,
  qty: positiveDecimalSchema,
  unit_selling_price: priceSchema,
  discount_amount: moneyInputSchema,
});

const packagingUsageSchema = z.object({
  packaging_material_id: uuidSchema,
  actual_usage_qty: usageQtySchema,
});

const createSaleSchema = z.object({
  sales_channel_id: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    uuidSchema.nullable(),
  ),
  transaction_date: z.date("Tanggal transaksi tidak valid."),
  external_order_number: optionalTextSchema,
  payment_status: z.enum(SALE_PAYMENT_STATUS_INPUTS),
  payment_method: z.enum(SALE_PAYMENT_METHODS),
  package_size_id: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    uuidSchema.nullable(),
  ),
  package_count: z.preprocess(
    (value) => resolvePackageCount(value as string | number | null | undefined),
    z.number().finite("Jumlah paket harus lebih dari 0.").positive("Jumlah paket harus lebih dari 0."),
  ),
  discount_amount: moneyInputSchema,
  additional_fee_amount: moneyInputSchema,
  items: z.array(saleItemSchema).min(1, "Minimal satu item wajib diisi"),
  packaging_overrides: z.array(packagingUsageSchema).default([]),
  extra_materials: z.array(packagingUsageSchema).default([]),
});

const voidSaleSchema = z.object({
  id: uuidSchema,
  reason: z.string().trim().min(1, "Alasan pembatalan wajib diisi.").max(500, "Alasan pembatalan terlalu panjang."),
});

const markPaidSaleSchema = z.object({
  id: uuidSchema,
  payment_method: z.enum(SALE_PAYMENT_METHODS),
});

const markSettledSaleSchema = z.object({
  id: uuidSchema,
});

const REVALIDATE_PATHS = [
  "/sales",
  "/dashboard",
  "/inventory",
  "/master/packaging",
  "/master/products",
];

function readUsageRows(
  formData: FormData,
  idField: string,
  qtyField: string,
): Array<{ packaging_material_id: FormDataEntryValue | null; actual_usage_qty: FormDataEntryValue | null }> {
  const ids = formData.getAll(idField);
  const quantities = formData.getAll(qtyField);

  return ids
    .map((id, index) => ({
      packaging_material_id: id,
      actual_usage_qty: quantities[index] ?? null,
    }))
    .filter(
      (row) =>
        typeof row.packaging_material_id === "string" &&
        row.packaging_material_id.trim() !== "",
    );
}

export async function createSaleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const variantIds = formData.getAll("variant_id");
    const quantities = formData.getAll("qty");
    const unitPrices = formData.getAll("unit_price");
    const itemDiscounts = formData.getAll("item_discount");
    const rawTransactionDate = formData.get("transaction_date");
    const transactionDate =
      typeof rawTransactionDate === "string"
        ? parseStrictDateInput(rawTransactionDate)
        : null;
    if (!transactionDate) {
      return { error: "Tanggal transaksi tidak valid." };
    }

    const parsed = createSaleSchema.safeParse({
      sales_channel_id: formData.get("sales_channel_id"),
      transaction_date: transactionDate,
      external_order_number: formData.get("external_order_number"),
      payment_status: formData.get("payment_status"),
      payment_method: formData.get("payment_method"),
      package_size_id: formData.get("package_size_id"),
      package_count: formData.get("package_count"),
      discount_amount: formData.get("discount_amount"),
      additional_fee_amount: formData.get("additional_fee_amount"),
      items: variantIds.map((variantId, index) => ({
        variant_id: variantId,
        qty: quantities[index],
        unit_selling_price: unitPrices[index],
        discount_amount: itemDiscounts[index] ?? "0",
      })),
      packaging_overrides: readUsageRows(
        formData,
        "packaging_material_id",
        "actual_usage_qty",
      ),
      extra_materials: readUsageRows(
        formData,
        "extra_material_id",
        "extra_usage_qty",
      ),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const data = parsed.data;
    const user = await requireAuth();

    const created = await prisma.$transaction(async (tx) => {
      const [activeChannels, settings, variants, packageSize] = await Promise.all([
        tx.salesChannels.findMany({
          where: { is_active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, is_marketplace: true },
        }),
        tx.businessSettings.findFirst({
          orderBy: { updated_at: "desc" },
          select: { default_admin_fee_rate: true },
        }),
        tx.productVariants.findMany({
          where: {
            id: { in: data.items.map((item) => item.variant_id) },
            is_active: true,
          },
          select: {
            id: true,
            name: true,
            stock_qty: true,
            product: { select: { name: true } },
            unit: { select: { name: true } },
            stock_batches: {
              where: { remaining_qty: { gt: 0 } },
              orderBy: [{ received_at: "asc" }, { id: "asc" }],
              select: {
                id: true,
                received_at: true,
                remaining_qty: true,
                unit_cost: true,
              },
            },
          },
        }),
        data.package_size_id
          ? tx.packageSizes.findFirst({
              where: { id: data.package_size_id, is_active: true },
              select: {
                id: true,
                items: {
                  select: {
                    packaging_material_id: true,
                    default_usage_qty: true,
                  },
                },
              },
            })
          : Promise.resolve(null),
      ]);

      const channel = data.sales_channel_id
        ? activeChannels.find((item) => item.id === data.sales_channel_id)
        : resolveDefaultSalesChannel(activeChannels);
      if (!channel) {
        throw new ActionError("Kanal penjualan tidak ditemukan atau tidak aktif.");
      }
      if (variants.length !== data.items.length) {
        throw new ActionError("Sebagian varian tidak ditemukan atau tidak aktif.");
      }
      if (data.package_size_id && !packageSize) {
        throw new ActionError("Ukuran paket tidak ditemukan atau tidak aktif.");
      }
      if (!packageSize && data.packaging_overrides.length > 0) {
        throw new ActionError(
          "Penyesuaian kemasan memerlukan ukuran paket yang dipilih.",
        );
      }

      const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
      const standardMaterialIds = new Set(
        packageSize?.items.map((item) => item.packaging_material_id) ?? [],
      );
      const overrideMaterialIds = data.packaging_overrides.map(
        (item) => item.packaging_material_id,
      );
      const extraMaterialIds = data.extra_materials.map(
        (item) => item.packaging_material_id,
      );

      for (const materialId of overrideMaterialIds) {
        if (!standardMaterialIds.has(materialId)) {
          throw new ActionError(
            "Material penyesuaian tidak termasuk ukuran paket yang dipilih.",
          );
        }
      }
      if (new Set(extraMaterialIds).size !== extraMaterialIds.length) {
        throw new ActionError(
          "Material kemasan tambahan tidak boleh duplikat.",
        );
      }

      const materialIds = [
        ...new Set([...standardMaterialIds, ...extraMaterialIds]),
      ];
      const materials = materialIds.length
        ? await tx.packagingMaterials.findMany({
            where: { id: { in: materialIds }, is_active: true },
            select: {
              id: true,
              name: true,
              stock_qty: true,
              average_unit_cost: true,
            },
          })
        : [];
      if (materials.length !== materialIds.length) {
        throw new ActionError(
          "Sebagian material kemasan tidak ditemukan atau tidak aktif.",
        );
      }

      const stockByVariant = Object.fromEntries(
        variants.map((variant) => [variant.id, variant.stock_qty]),
      );
      const lineError = validateSaleItems(data.items, stockByVariant);
      if (lineError) throw new ActionError(lineError);

      const itemsWithBatches = data.items.map((item) => {
        const variant = variantMap.get(item.variant_id);
        if (!variant) throw new ActionError("Varian tidak ditemukan.");

        return {
          ...item,
          batches: variant.stock_batches.map((batch) => ({
            id: batch.id,
            received_at: batch.received_at,
            remaining_qty: batch.remaining_qty,
            unit_cost: batch.unit_cost,
          })),
        };
      });
      const allocations = allocateSaleItems(itemsWithBatches);

      const packageSizeItems: PackageSizeItemInput[] =
        packageSize?.items.map((item) => ({
          packaging_material_id: item.packaging_material_id,
          default_usage_qty: item.default_usage_qty,
        })) ?? [];
      const packagingOverrides: PackagingUsageOverride[] =
        data.packaging_overrides;
      const packaging = calculateSalePackagingUsage({
        materials,
        packageSizeItems,
        packageCount: data.package_count,
        overrides: packagingOverrides,
        additionalItems: data.extra_materials,
      });

      const itemSubtotal = data.items.reduce(
        (sum, item) => sum + calculateSaleItemSubtotal(item),
        BigInt(0),
      );
      const adminFeeRate = channel.is_marketplace
        ? (settings?.default_admin_fee_rate ?? new Prisma.Decimal(22))
        : new Prisma.Decimal(0);
      const adminFeeEstimate = calculateAdminFeeEstimate({
        subtotal: itemSubtotal,
        discount: data.discount_amount,
        isMarketplace: channel.is_marketplace,
        rate: adminFeeRate,
      });
      const summary = calculateSaleSummary({
        items: data.items,
        allocations,
        packagingCogs: packaging.packagingCogs,
        discountAmount: data.discount_amount,
        additionalFeeAmount: data.additional_fee_amount,
        adminFeeEstimate,
      });

      const paymentStatus = resolveSalePaymentStatus(data.payment_status);
      const settlementStatus = channel.is_marketplace
        ? "Belum_cair"
        : "Tidak_dicairkan";
      const transactionNumber = await generateDocumentNumber("SALE", tx);

      const sale = await tx.sales.create({
        data: {
          transaction_number: transactionNumber,
          sales_channel_id: channel.id,
          package_size_id: data.package_size_id,
          external_order_number: data.external_order_number ?? null,
          transaction_date: data.transaction_date,
          subtotal_amount: summary.subtotal,
          discount_amount: data.discount_amount,
          additional_fee_amount: data.additional_fee_amount,
          total_amount: summary.totalRevenue,
          admin_fee_estimate_rate: adminFeeRate,
          admin_fee_estimate_amount: adminFeeEstimate,
          order_status: "Selesai",
          payment_status: paymentStatus,
          payment_method: data.payment_method,
          settlement_status: settlementStatus,
          is_stock_deducted: true,
          created_by_id: user.id,
          ...(paymentStatus === "Dibayar"
            ? {
                payments: {
                  create: [
                    {
                      payment_date: data.transaction_date,
                      amount: summary.totalRevenue,
                      payment_method: data.payment_method,
                      created_by_id: user.id,
                    },
                  ],
                },
              }
            : {}),
          items: {
            create: data.items.map((item, index) => {
              const allocation = allocations[index];
              if (!allocation) throw new ActionError("Alokasi item gagal dibuat.");

              return {
                variant_id: item.variant_id,
                qty: allocation.qty,
                unit_selling_price: item.unit_selling_price,
                discount_amount: item.discount_amount,
                subtotal_amount: calculateSaleItemSubtotal(item),
                total_hpp_fifo: allocation.result.total_hpp,
                batch_allocations: {
                  create: allocation.result.allocations.map((detail) => ({
                    batch_id: detail.batch_id,
                    allocated_qty: detail.allocated_qty,
                    batch_unit_cost: detail.unit_cost,
                  })),
                },
              };
            }),
          },
          packaging_usages: {
            create: packaging.lines.map((line) => ({
              packaging_material_id: line.packaging_material_id,
              standard_usage_qty: line.standard_usage_qty,
              actual_usage_qty: line.actual_usage_qty,
              unit_cost_snapshot: line.unit_cost_snapshot,
              calculated_hpp: line.calculated_hpp,
              is_stock_deducted: true,
            })),
          },
          status_histories: {
            create: [
              {
                status_group: "ORDER",
                old_status: null,
                new_status: "Selesai",
                created_by_id: user.id,
              },
              {
                status_group: "PAYMENT",
                old_status: null,
                new_status: paymentStatus,
                reason: salePaymentHistoryReason(data.payment_method),
                created_by_id: user.id,
              },
              {
                status_group: "SETTLEMENT",
                old_status: null,
                new_status: settlementStatus,
                created_by_id: user.id,
              },
            ],
          },
        },
        select: { id: true, transaction_number: true },
      });

      for (let index = 0; index < allocations.length; index += 1) {
        const allocation = allocations[index];
        const item = data.items[index];
        if (!allocation || !item) continue;

        const variant = variantMap.get(item.variant_id);
        if (!variant) throw new ActionError("Varian tidak ditemukan.");

        let balance = variant.stock_qty;
        for (const detail of allocation.result.allocations) {
          balance = balance.minus(detail.allocated_qty);

          await tx.stockBatches.update({
            where: { id: detail.batch_id },
            data: { remaining_qty: { decrement: detail.allocated_qty } },
          });

          await tx.stockMovements.create({
            data: {
              variant_id: item.variant_id,
              batch_id: detail.batch_id,
              stock_pool: "SELLABLE",
              movement_type: "PENJUALAN",
              qty_change: detail.allocated_qty.negated(),
              balance_after: balance,
              reference_type: "Sales",
              reference_id: sale.id,
              reference_number: sale.transaction_number,
              created_by_id: user.id,
            },
          });
        }

        await tx.productVariants.update({
          where: { id: item.variant_id },
          data: { stock_qty: { decrement: allocation.qty } },
        });
      }

      for (const line of packaging.lines) {
        await tx.packagingMaterials.update({
          where: { id: line.packaging_material_id },
          data: { stock_qty: { decrement: line.actual_usage_qty } },
        });

        await tx.packagingMovements.create({
          data: {
            packaging_material_id: line.packaging_material_id,
            movement_type: "PEMAKAIAN_PENJUALAN",
            qty_change: line.actual_usage_qty.negated(),
            reference_type: "Sales",
            reference_id: sale.id,
            reference_number: sale.transaction_number,
            created_by_id: user.id,
          },
        });
      }

      await logActivity(tx, user.id, "Sales", sale.id, "CREATE", {
        transaction_number: sale.transaction_number,
        total_amount: summary.totalRevenue.toString(),
        product_cogs: summary.productCogs.toString(),
        packaging_cogs: summary.packagingCogs.toString(),
      });

      return sale;
    });

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }

    return {
      success: `Transaksi ${created.transaction_number} berhasil dicatat.`,
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function voidSaleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = voidSaleSchema.safeParse({
      id: formData.get("id"),
      reason: formData.get("reason"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const reasonError = validateSaleVoidReason(parsed.data.reason);
    if (reasonError) return { error: reasonError };

    const user = await requireAuth();

    const voided = await prisma.$transaction(async (tx) => {
      const sale = await tx.sales.findUnique({
        where: { id: parsed.data.id },
        select: {
          id: true,
          transaction_number: true,
          order_status: true,
          payment_status: true,
          is_stock_deducted: true,
          items: {
            select: {
              batch_allocations: {
                select: {
                  id: true,
                  batch_id: true,
                  allocated_qty: true,
                  reversed_qty: true,
                  sale_item: { select: { variant_id: true } },
                },
              },
            },
          },
          packaging_usages: {
            select: {
              id: true,
              packaging_material_id: true,
              actual_usage_qty: true,
              is_stock_deducted: true,
              is_stock_restored: true,
            },
          },
          customer_returns: {
            where: { claim_status: { not: "Ditolak" } },
            select: { id: true },
          },
          payments: {
            where: { is_void: false },
            select: { id: true },
          },
          marketplace_settlements: {
            where: { is_void: false },
            select: { id: true },
          },
        },
      });

      if (!sale) {
        throw new ActionError("Transaksi penjualan tidak ditemukan.");
      }

      const eligibilityError = validateSaleVoidEligibility({
        order_status: sale.order_status,
        is_stock_deducted: sale.is_stock_deducted,
        has_active_customer_return: sale.customer_returns.length > 0,
        has_active_settlement: sale.marketplace_settlements.length > 0,
      });
      if (eligibilityError) throw new ActionError(eligibilityError);

      const allocations = sale.items.flatMap((item) =>
        item.batch_allocations.map((allocation) => ({
          id: allocation.id,
          variant_id: allocation.sale_item.variant_id,
          batch_id: allocation.batch_id,
          allocated_qty: allocation.allocated_qty,
          reversed_qty: allocation.reversed_qty,
        })),
      );
      const restorations = planSaleVoidRestorations(allocations);
      const packagingRestorations = planSaleVoidPackagingRestorations(
        sale.packaging_usages,
      );
      const paymentVoids = planSaleVoidPaymentVoids(
        sale.payments,
        parsed.data.reason,
      );
      const hasPaidStatus =
        sale.payment_status === "Dibayar" || paymentVoids.length > 0;

      const statusHistory = await tx.saleStatusHistories.create({
        data: {
          sale_id: sale.id,
          status_group: "ORDER",
          old_status: sale.order_status,
          new_status: "Dibatalkan",
          reason: parsed.data.reason,
          created_by_id: user.id,
        },
        select: { id: true },
      });

      if (hasPaidStatus) {
        await tx.saleStatusHistories.create({
          data: {
            sale_id: sale.id,
            status_group: "PAYMENT",
            old_status: sale.payment_status,
            new_status: "Dikembalikan",
            reason: saleVoidPaymentHistoryReason(parsed.data.reason),
            created_by_id: user.id,
          },
        });
        await tx.salePayments.updateMany({
          where: {
            id: { in: paymentVoids.map((payment) => payment.id) },
            is_void: false,
          },
          data: {
            is_void: true,
            void_reason: saleVoidPaymentHistoryReason(parsed.data.reason),
            voided_by_id: user.id,
          },
        });
      }

      for (const restoration of restorations) {
        await tx.saleItemBatchAllocations.update({
          where: { id: restoration.allocation_id },
          data: { reversed_qty: { increment: restoration.qty } },
        });
        await tx.saleItemBatchAllocationReversals.create({
          data: {
            allocation_id: restoration.allocation_id,
            reversal_type: "CANCELLATION",
            sale_status_history_id: statusHistory.id,
            reversed_qty: restoration.qty,
            created_by_id: user.id,
          },
        });
        await tx.stockBatches.update({
          where: { id: restoration.batch_id },
          data: { remaining_qty: { increment: restoration.qty } },
        });
        const updatedVariant = await tx.productVariants.update({
          where: { id: restoration.variant_id },
          data: { stock_qty: { increment: restoration.qty } },
          select: { stock_qty: true },
        });
        await tx.stockMovements.create({
          data: {
            variant_id: restoration.variant_id,
            batch_id: restoration.batch_id,
            stock_pool: "SELLABLE",
            movement_type: "PEMBATALAN_PENJUALAN",
            qty_change: restoration.qty,
            balance_after: updatedVariant.stock_qty,
            reference_type: "Sales",
            reference_id: sale.id,
            reference_number: sale.transaction_number,
            notes: parsed.data.reason,
            created_by_id: user.id,
          },
        });
      }

      for (const usage of packagingRestorations) {
        await tx.packagingMaterials.update({
          where: { id: usage.packaging_material_id },
          data: { stock_qty: { increment: usage.qty } },
        });
        await tx.salePackagingUsages.update({
          where: { id: usage.id },
          data: { is_stock_restored: true },
        });
        await tx.packagingMovements.create({
          data: {
            packaging_material_id: usage.packaging_material_id,
            movement_type: "PEMBATALAN_PENJUALAN",
            qty_change: usage.qty,
            reference_type: "Sales",
            reference_id: sale.id,
            reference_number: sale.transaction_number,
            created_by_id: user.id,
          },
        });
      }

      await tx.sales.update({
        where: { id: sale.id },
        data: {
          order_status: "Dibatalkan",
          payment_status: hasPaidStatus ? "Dikembalikan" : sale.payment_status,
          is_stock_deducted: false,
        },
      });

      await logActivity(tx, user.id, "Sales", sale.id, "VOID", {
        transaction_number: sale.transaction_number,
        reason: parsed.data.reason,
        restored_allocations: restorations.length,
        restored_packaging_usages: packagingRestorations.length,
        voided_payments: paymentVoids.length,
      });

      return { transaction_number: sale.transaction_number };
    });

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }
    revalidatePath(`/sales/${parsed.data.id}`);

    return {
      success: `Transaksi ${voided.transaction_number} berhasil dibatalkan dan stok dikembalikan.`,
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function markSalePaidAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = markPaidSaleSchema.safeParse({
      id: formData.get("id"),
      payment_method: formData.get("payment_method"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const user = await requireAuth();

    const updated = await prisma.$transaction(async (tx) => {
      const sale = await tx.sales.findUnique({
        where: { id: parsed.data.id },
        select: {
          id: true,
          transaction_number: true,
          total_amount: true,
          order_status: true,
          payment_status: true,
        },
      });

      if (!sale) {
        throw new ActionError("Transaksi penjualan tidak ditemukan.");
      }

      const eligibilityError = validateSalePaidStatus({
        order_status: sale.order_status,
        payment_status: sale.payment_status,
      });
      if (eligibilityError) throw new ActionError(eligibilityError);

      await tx.sales.update({
        where: { id: sale.id },
        data: {
          payment_status: "Dibayar",
          payment_method: parsed.data.payment_method,
        },
      });

      await tx.salePayments.create({
        data: {
          sale_id: sale.id,
          payment_date: new Date(),
          amount: sale.total_amount,
          payment_method: parsed.data.payment_method,
          created_by_id: user.id,
        },
      });

      await tx.saleStatusHistories.create({
        data: {
          sale_id: sale.id,
          status_group: "PAYMENT",
          old_status: sale.payment_status,
          new_status: "Dibayar",
          reason: salePaymentHistoryReason(parsed.data.payment_method),
          created_by_id: user.id,
        },
      });

      await logActivity(tx, user.id, "Sales", sale.id, "MARK_PAID", {
        transaction_number: sale.transaction_number,
        payment_method: parsed.data.payment_method,
        amount: sale.total_amount.toString(),
      });

      return { transaction_number: sale.transaction_number };
    });

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }
    revalidatePath(`/sales/${parsed.data.id}`);

    return {
      success: `Transaksi ${updated.transaction_number} ditandai lunas.`,
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function markSaleSettledAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = markSettledSaleSchema.safeParse({
      id: formData.get("id"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    }

    const user = await requireAuth();

    const updated = await prisma.$transaction(async (tx) => {
      const sale = await tx.sales.findUnique({
        where: { id: parsed.data.id },
        select: {
          id: true,
          transaction_number: true,
          order_status: true,
          settlement_status: true,
        },
      });

      if (!sale) {
        throw new ActionError("Transaksi penjualan tidak ditemukan.");
      }

      const eligibilityError = validateSaleSettlementStatus({
        order_status: sale.order_status,
        settlement_status: sale.settlement_status,
      });
      if (eligibilityError) throw new ActionError(eligibilityError);

      await tx.sales.update({
        where: { id: sale.id },
        data: { settlement_status: "Sudah_cair" },
      });

      await tx.saleStatusHistories.create({
        data: {
          sale_id: sale.id,
          status_group: "SETTLEMENT",
          old_status: sale.settlement_status,
          new_status: "Sudah_cair",
          reason: "Dana transaksi dicairkan.",
          created_by_id: user.id,
        },
      });

      await logActivity(tx, user.id, "Sales", sale.id, "MARK_SETTLED", {
        transaction_number: sale.transaction_number,
        old_status: sale.settlement_status,
        new_status: "Sudah_cair",
      });

      return { transaction_number: sale.transaction_number };
    });

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }
    revalidatePath(`/sales/${parsed.data.id}`);

    return {
      success: `Dana transaksi ${updated.transaction_number} ditandai sudah dicairkan.`,
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}