import { Prisma } from "@prisma/client";
import {
  allocateFifoBatches,
  calculateItemSubtotal,
  roundToBigInt,
  toMoney,
  type DecimalInput,
  type FifoAllocationResult,
  type FifoBatch,
} from "../purchases/purchase-rules";

function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(value.toString());
}

export type SaleItemInput = {
  variant_id: string;
  qty: DecimalInput;
  unit_selling_price: bigint | number | string;
  discount_amount?: bigint | number | string;
};

export function calculateSaleItemSubtotal(item: SaleItemInput): bigint {
  const gross = calculateItemSubtotal({
    ordered_qty: item.qty,
    unit_price: item.unit_selling_price,
  });
  const discount = toMoney((item.discount_amount ?? 0).toString());

  if (discount < BigInt(0)) {
    throw new Error("Diskon item tidak boleh negatif.");
  }
  if (discount > gross) {
    throw new Error("Diskon item melebihi nilai baris.");
  }

  return gross - discount;
}

export function validateSaleItems(
  items: readonly SaleItemInput[],
  stockByVariant?: Readonly<Record<string, DecimalInput>>,
): string | null {
  if (items.length === 0) {
    return "Minimal satu item wajib diisi";
  }

  for (const item of items) {
    if (toDecimal(item.qty).lte(0)) {
      return "Jumlah penjualan harus lebih dari 0";
    }
    if (toMoney(item.unit_selling_price.toString()) <= BigInt(0)) {
      return "Harga jual harus lebih dari 0";
    }

    try {
      calculateSaleItemSubtotal(item);
    } catch (error) {
      return error instanceof Error ? error.message : "Diskon item tidak valid.";
    }

    if (stockByVariant) {
      const available = stockByVariant[item.variant_id];
      if (available !== undefined && toDecimal(item.qty).gt(toDecimal(available))) {
        return "Stok produk tidak mencukupi";
      }
    }
  }

  const variantIds = items.map((item) => item.variant_id);
  if (new Set(variantIds).size !== variantIds.length) {
    return "Varian tidak boleh duplikat dalam satu penjualan.";
  }

  return null;
}

export type SaleItemWithBatches = SaleItemInput & {
  batches: readonly FifoBatch[];
};

export type SaleAllocation = {
  variant_id: string;
  qty: Prisma.Decimal;
  result: FifoAllocationResult;
};

export function allocateSaleItems(
  items: readonly SaleItemWithBatches[],
): SaleAllocation[] {
  return items.map((item) => {
    const qty = toDecimal(item.qty);
    if (qty.lte(0)) {
      throw new Error("Jumlah penjualan harus lebih dari 0");
    }

    return {
      variant_id: item.variant_id,
      qty,
      result: allocateFifoBatches(item.batches, qty),
    };
  });
}

export function calculateProductCogs(
  allocations: readonly SaleAllocation[],
): bigint {
  return allocations.reduce(
    (sum, allocation) => sum + allocation.result.total_hpp,
    BigInt(0),
  );
}

export type PackageSizeItemInput = {
  packaging_material_id: string;
  default_usage_qty: DecimalInput;
};

export type PackagingMaterialInput = {
  id: string;
  name?: string;
  stock_qty: DecimalInput;
  average_unit_cost: DecimalInput;
};

export type PackagingUsageOverride = {
  packaging_material_id: string;
  actual_usage_qty: DecimalInput;
};

export type SalePackagingCalculationInput = {
  materials: readonly PackagingMaterialInput[];
  packageSizeItems?: readonly PackageSizeItemInput[];
  packageCount?: DecimalInput;
  overrides?: readonly PackagingUsageOverride[];
  additionalItems?: readonly PackagingUsageOverride[];
};

export type SalePackagingUsageLine = {
  packaging_material_id: string;
  material_name: string;
  standard_usage_qty: Prisma.Decimal;
  actual_usage_qty: Prisma.Decimal;
  unit_cost_snapshot: Prisma.Decimal;
  calculated_hpp: bigint;
};

export type SalePackagingCalculationResult = {
  lines: SalePackagingUsageLine[];
  packagingCogs: bigint;
};

type RequiredPackagingUsage = {
  standard_usage_qty: Prisma.Decimal;
  actual_usage_qty: Prisma.Decimal;
};

export function calculateSalePackagingUsage(
  input: SalePackagingCalculationInput,
): SalePackagingCalculationResult {
  const packageCount = toDecimal(input.packageCount ?? 1);
  if (packageCount.lte(0)) {
    throw new Error("Jumlah paket harus lebih dari 0.");
  }

  const materialMap = new Map(input.materials.map((item) => [item.id, item]));
  const overrideMap = new Map(
    (input.overrides ?? []).map((item) => [
      item.packaging_material_id,
      toDecimal(item.actual_usage_qty),
    ]),
  );
  const required = new Map<string, RequiredPackagingUsage>();

  for (const item of input.packageSizeItems ?? []) {
    const standard = toDecimal(item.default_usage_qty);
    if (standard.lt(0)) {
      throw new Error("Takaran standar kemasan tidak boleh negatif.");
    }

    const override = overrideMap.get(item.packaging_material_id);
    if (override !== undefined && override.lt(0)) {
      throw new Error("Pemakaian aktual kemasan tidak boleh negatif.");
    }

    required.set(item.packaging_material_id, {
      standard_usage_qty: standard,
      actual_usage_qty:
        override !== undefined ? override : standard.mul(packageCount),
    });
  }

  for (const item of input.additionalItems ?? []) {
    const qty = toDecimal(item.actual_usage_qty);
    if (qty.lt(0)) {
      throw new Error("Pemakaian aktual kemasan tidak boleh negatif.");
    }

    const current = required.get(item.packaging_material_id);
    required.set(item.packaging_material_id, {
      standard_usage_qty: current?.standard_usage_qty ?? new Prisma.Decimal(0),
      actual_usage_qty:
        current?.actual_usage_qty ?? new Prisma.Decimal(0).plus(qty),
    });
  }

  let packagingCogs = BigInt(0);
  const lines: SalePackagingUsageLine[] = [];

  for (const [materialId, usage] of required) {
    if (usage.actual_usage_qty.lte(0)) continue;

    const material = materialMap.get(materialId);
    if (!material) {
      throw new Error("Material kemasan tidak ditemukan.");
    }
    if (usage.actual_usage_qty.gt(toDecimal(material.stock_qty))) {
      throw new Error(
        `Stok kemasan tidak mencukupi untuk ${material.name ?? materialId}.`,
      );
    }

    const unitCost = toDecimal(material.average_unit_cost);
    if (unitCost.lt(0)) {
      throw new Error("Biaya modal kemasan tidak valid.");
    }

    const calculatedHpp = roundToBigInt(unitCost.mul(usage.actual_usage_qty));
    packagingCogs += calculatedHpp;
    lines.push({
      packaging_material_id: materialId,
      material_name: material.name ?? materialId,
      standard_usage_qty: usage.standard_usage_qty,
      actual_usage_qty: usage.actual_usage_qty,
      unit_cost_snapshot: unitCost,
      calculated_hpp: calculatedHpp,
    });
  }

  return { lines, packagingCogs };
}

export type AdminFeeEstimateInput = {
  subtotal: bigint;
  discount: bigint;
  isMarketplace: boolean;
  rate?: DecimalInput;
};

export function calculateAdminFeeEstimate(
  input: AdminFeeEstimateInput,
): bigint {
  if (!input.isMarketplace) return BigInt(0);

  const base = input.subtotal - input.discount;
  if (base < BigInt(0)) {
    throw new Error("Diskon transaksi melebihi subtotal.");
  }

  const rate = toDecimal(input.rate ?? 22);
  if (rate.lt(0)) {
    throw new Error("Persentase biaya admin tidak valid.");
  }

  return roundToBigInt(toDecimal(base.toString()).mul(rate).div(100));
}

export type SaleSummaryInput = {
  items: readonly SaleItemInput[];
  allocations: readonly SaleAllocation[];
  packagingCogs?: bigint;
  discountAmount?: bigint;
  additionalFeeAmount?: bigint;
  adminFeeEstimate?: bigint;
};

export type SaleSummary = {
  subtotal: bigint;
  totalRevenue: bigint;
  productCogs: bigint;
  packagingCogs: bigint;
  totalCogs: bigint;
  grossProfit: bigint;
  adminFeeEstimate: bigint;
  netRevenue: bigint;
  netGrossProfit: bigint;
};

export function calculateSaleSummary(input: SaleSummaryInput): SaleSummary {
  const subtotal = input.items.reduce(
    (sum, item) => sum + calculateSaleItemSubtotal(item),
    BigInt(0),
  );
  const discount = toMoney((input.discountAmount ?? BigInt(0)).toString());
  const additionalFee = toMoney(
    (input.additionalFeeAmount ?? BigInt(0)).toString(),
  );
  const packagingCogs = toMoney((input.packagingCogs ?? BigInt(0)).toString());
  const adminFeeEstimate = toMoney(
    (input.adminFeeEstimate ?? BigInt(0)).toString(),
  );

  if (discount < BigInt(0) || additionalFee < BigInt(0)) {
    throw new Error("Diskon dan biaya tambahan tidak boleh negatif.");
  }
  if (discount > subtotal) {
    throw new Error("Diskon transaksi melebihi subtotal.");
  }
  if (packagingCogs < BigInt(0)) {
    throw new Error("HPP kemasan tidak boleh negatif.");
  }
  if (adminFeeEstimate < BigInt(0)) {
    throw new Error("Biaya admin tidak boleh negatif.");
  }

  const totalRevenue = subtotal - discount + additionalFee;
  if (totalRevenue < BigInt(0)) {
    throw new Error("Total transaksi tidak boleh negatif.");
  }

  const productCogs = calculateProductCogs(input.allocations);
  const totalCogs = productCogs + packagingCogs;
  const netRevenue = totalRevenue - adminFeeEstimate;

  return {
    subtotal,
    totalRevenue,
    productCogs,
    packagingCogs,
    totalCogs,
    grossProfit: totalRevenue - totalCogs,
    adminFeeEstimate,
    netRevenue,
    netGrossProfit: netRevenue - totalCogs,
  };
}
