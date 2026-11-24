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
import {
  allocateSaleItems,
  calculateAdminFeeEstimate,
  calculateSaleItemSubtotal,
  calculateSalePackagingUsage,
  calculateSaleSummary,
  validateSaleItems,
  type PackageSizeItemInput,
  type PackagingUsageOverride,
} from "./sales-rules";

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
  sales_channel_id: uuidSchema,
  transaction_date: z.date(),
  external_order_number: optionalTextSchema,
  package_size_id: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    uuidSchema.nullable(),
  ),
  package_count: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 1 : Number(value)),
    z.number().finite().positive("Jumlah paket harus lebih dari 0."),
  ),
  discount_amount: moneyInputSchema,
  additional_fee_amount: moneyInputSchema,
  items: z.array(saleItemSchema).min(1, "Minimal satu item wajib diisi"),
  packaging_overrides: z.array(packagingUsageSchema).default([]),
  extra_materials: z.array(packagingUsageSchema).default([]),
});

const REVALIDATE_PATHS = [
  "/sales",
  "/dashboard",
  "/inventory",
  "/master/packaging",
  "/master/products",
];

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

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
  const variantIds = formData.getAll("variant_id");
  const quantities = formData.getAll("qty");
  const unitPrices = formData.getAll("unit_price");
  const itemDiscounts = formData.getAll("item_discount");

  const parsed = createSaleSchema.safeParse({
    sales_channel_id: formData.get("sales_channel_id"),
    transaction_date: parseDateInput(formData.get("transaction_date")),
    external_order_number: formData.get("external_order_number"),
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

  try {
    const created = await prisma.$transaction(async (tx) => {
      const [channel, settings, variants, packageSize] = await Promise.all([
        tx.salesChannels.findFirst({
          where: { id: data.sales_channel_id, is_active: true },
          select: { id: true, is_marketplace: true },
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
          payment_status: "Belum_dibayar",
          settlement_status: settlementStatus,
          is_stock_deducted: true,
          created_by_id: user.id,
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
                new_status: "Belum_dibayar",
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
    return toActionError(error, "Gagal menyimpan transaksi penjualan.");
  }
}
