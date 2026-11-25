import {
  PackagingMovementType,
  Prisma,
  StockMovementType,
} from "@prisma/client";
import { uuidSchema } from "@/lib/schemas";
import {
  allocateFifoBatches,
  roundToBigInt,
  toMoney,
  type DecimalInput,
  type FifoAllocation,
  type FifoBatch,
} from "../purchases/purchase-rules";

function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(value.toString());
}

export type InventoryItemFilter = {
  variant_id?: string;
  packaging_material_id?: string;
};

export function buildInventoryItemFilter(
  itemType: "product",
  itemId: string,
): { variant_id?: string };
export function buildInventoryItemFilter(
  itemType: "packaging",
  itemId: string,
): { packaging_material_id?: string };
export function buildInventoryItemFilter(
  itemType: "product" | "packaging",
  itemId: string,
): InventoryItemFilter {
  const id = itemId.trim();
  if (!id || !uuidSchema.safeParse(id).success) {
    return {};
  }
  return itemType === "product"
    ? { variant_id: id }
    : { packaging_material_id: id };
}

export type StockAdjustmentInput = {
  variant_id: string;
  qty_change: DecimalInput;
  unit_cost?: bigint | number | string;
  reason: string;
};

export type StockAdjustmentPlan = {
  qty_change: Prisma.Decimal;
  direction: "IN" | "OUT";
  unit_cost: bigint;
  reason: string;
  allocations: FifoAllocation[];
  total_hpp: bigint;
};

export function validateStockAdjustmentReason(reason: string): string | null {
  if (typeof reason !== "string" || reason.trim() === "") {
    return "Alasan penyesuaian wajib diisi";
  }
  if (reason.trim().length > 500) {
    return "Alasan penyesuaian terlalu panjang";
  }
  return null;
}

export function validateStockAdjustment(
  input: StockAdjustmentInput,
  batches: readonly FifoBatch[] = [],
): string | null {
  const reasonError = validateStockAdjustmentReason(input.reason);
  if (reasonError) return reasonError;

  let qty: Prisma.Decimal;
  try {
    qty = toDecimal(input.qty_change);
  } catch {
    return "Selisih stok tidak valid.";
  }

  if (qty.eq(0)) {
    return "Selisih stok tidak boleh 0";
  }

  if (qty.lt(0)) {
    try {
      allocateFifoBatches(batches, qty.abs());
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Stok batch tidak mencukupi.";
    }
    return null;
  }

  try {
    const unitCost = toMoney(input.unit_cost ?? BigInt(0));
    if (unitCost < BigInt(0)) {
      return "HPP batch penyesuaian tidak boleh negatif.";
    }
  } catch (error) {
    return error instanceof Error ? error.message : "HPP tidak valid.";
  }

  return null;
}

export function planStockAdjustment(
  input: StockAdjustmentInput,
  batches: readonly FifoBatch[] = [],
): StockAdjustmentPlan {
  const validationError = validateStockAdjustment(input, batches);
  if (validationError) throw new Error(validationError);

  const qty = toDecimal(input.qty_change);
  if (qty.gt(0)) {
    return {
      qty_change: qty,
      direction: "IN",
      unit_cost: toMoney(input.unit_cost ?? BigInt(0)),
      reason: input.reason.trim(),
      allocations: [],
      total_hpp: BigInt(0),
    };
  }

  const result = allocateFifoBatches(batches, qty.abs());
  return {
    qty_change: qty,
    direction: "OUT",
    unit_cost: BigInt(0),
    reason: input.reason.trim(),
    allocations: result.allocations,
    total_hpp: result.total_hpp,
  };
}

export type ProductValuationInput = {
  remaining_qty: DecimalInput;
  unit_cost: bigint | number | string;
};

export type PackagingValuationInput = {
  current_stock: DecimalInput;
  average_unit_cost: DecimalInput;
};

export type InventoryValuationInput = {
  product_batches: readonly ProductValuationInput[];
  packaging_materials: readonly PackagingValuationInput[];
};

export type InventoryValuation = {
  productAssetValue: bigint;
  packagingAssetValue: bigint;
  totalAssetValue: bigint;
};

export function calculateInventoryValuation(
  input: InventoryValuationInput,
): InventoryValuation {
  const productAssetValue = input.product_batches.reduce(
    (sum, batch) =>
      sum +
      roundToBigInt(
        toDecimal(batch.remaining_qty).mul(
          toDecimal(toMoney(batch.unit_cost).toString()),
        ),
      ),
    BigInt(0),
  );

  const packagingAssetValue = input.packaging_materials.reduce(
    (sum, material) =>
      sum +
      roundToBigInt(
        toDecimal(material.current_stock).mul(
          toDecimal(material.average_unit_cost),
        ),
      ),
    BigInt(0),
  );

  return {
    productAssetValue,
    packagingAssetValue,
    totalAssetValue: productAssetValue + packagingAssetValue,
  };
}

export type LowStockCandidate = {
  id: string;
  name: string;
  stock_qty: DecimalInput;
  min_stock: DecimalInput | null | undefined;
};

export type LowStockAlert = {
  id: string;
  name: string;
  stock_qty: Prisma.Decimal;
  min_stock: Prisma.Decimal;
};

export function detectLowStock(
  items: readonly LowStockCandidate[],
): LowStockAlert[] {
  return items
    .filter((item) => {
      if (item.min_stock === null || item.min_stock === undefined) return false;
      return toDecimal(item.stock_qty).lte(toDecimal(item.min_stock));
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      stock_qty: toDecimal(item.stock_qty),
      min_stock: toDecimal(item.min_stock as DecimalInput),
    }));
}

export type MovementGroup = "IN" | "OUT" | "ADJUSTMENT";

export function classifyStockMovement(type: StockMovementType): MovementGroup {
  switch (type) {
    case StockMovementType.PENERIMAAN_PEMBELIAN:
    case StockMovementType.PEMBATALAN_PENJUALAN:
    case StockMovementType.RETUR_LAYAK_JUAL:
    case StockMovementType.PENGGANTI_RETUR_SUPPLIER:
      return "IN";
    case StockMovementType.PENJUALAN:
    case StockMovementType.RETUR_RUSAK:
    case StockMovementType.RETUR_SUPPLIER:
    case StockMovementType.PENGHAPUSAN_STOK:
      return "OUT";
    case StockMovementType.PENYESUAIAN_STOK:
      return "ADJUSTMENT";
  }
}

export function classifyPackagingMovement(
  type: PackagingMovementType,
): MovementGroup {
  switch (type) {
    case PackagingMovementType.PEMBELIAN:
    case PackagingMovementType.PEMBATALAN_PENJUALAN:
      return "IN";
    case PackagingMovementType.PEMAKAIAN_PENJUALAN:
      return "OUT";
    case PackagingMovementType.PENYESUAIAN_STOK:
      return "ADJUSTMENT";
  }
}
