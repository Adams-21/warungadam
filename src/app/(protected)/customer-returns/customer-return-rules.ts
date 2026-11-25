import { Prisma, ReturnCondition, ReturnFundStatus } from "@prisma/client";
import {
  roundToBigInt,
  toMoney,
  type DecimalInput,
} from "../purchases/purchase-rules";

function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(value.toString());
}

export type CustomerReturnAllocation = {
  id: string;
  sale_item_id: string;
  batch_id: string;
  received_at: Date | string;
  allocated_qty: DecimalInput;
  reversed_qty: DecimalInput;
  batch_unit_cost: bigint | number | string;
};

export type CustomerReturnItemInput = {
  sale_item_id?: string | null;
  variant_id: string;
  qty: DecimalInput;
  condition: ReturnCondition;
  unit_cost?: bigint | number | string;
};

export type CustomerReturnSaleItemVariant = {
  id: string;
  variant_id: string;
};

export function firstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function validateCustomerReturnSaleItemVariants(
  items: readonly CustomerReturnItemInput[],
  saleItems: readonly CustomerReturnSaleItemVariant[],
): string | null {
  for (const item of items) {
    if (!item.sale_item_id) continue;
    const saleItem = saleItems.find((row) => row.id === item.sale_item_id);
    if (!saleItem) {
      return "Barang retur tidak ditemukan pada transaksi asal.";
    }
    if (saleItem.variant_id !== item.variant_id) {
      return "Varian barang retur tidak sesuai dengan item transaksi asal.";
    }
  }
  return null;
}

export function resolveRefundPaidDate({
  nextStatus,
  currentStatus,
  currentPaidDate,
  submittedDate,
}: {
  nextStatus: ReturnFundStatus;
  currentStatus: ReturnFundStatus;
  currentPaidDate: Date | null;
  submittedDate: Date | null;
}): Date | null {
  if (nextStatus !== ReturnFundStatus.Dana_dikembalikan) return null;
  if (nextStatus === currentStatus && currentPaidDate) return currentPaidDate;
  return submittedDate;
}

export type BatchRestoration = {
  allocation_id: string;
  batch_id: string;
  qty: Prisma.Decimal;
  unit_cost: bigint;
  subtotal_hpp: bigint;
};

export type CustomerReturnPlanItem = {
  item: CustomerReturnItemInput;
  condition: ReturnCondition;
  qty: Prisma.Decimal;
  batch_restorations: BatchRestoration[];
  restored_hpp: bigint;
  damaged_qty: Prisma.Decimal;
  new_batch_unit_cost: bigint | null;
};

function allocationAvailability(allocation: CustomerReturnAllocation): Prisma.Decimal {
  const available = toDecimal(allocation.allocated_qty).minus(
    toDecimal(allocation.reversed_qty),
  );
  return available.lt(0) ? new Prisma.Decimal(0) : available;
}

function sortLifo(
  allocations: readonly CustomerReturnAllocation[],
): CustomerReturnAllocation[] {
  return [...allocations].sort((left, right) => {
    const dateDiff =
      new Date(right.received_at).getTime() -
      new Date(left.received_at).getTime();
    return dateDiff !== 0 ? dateDiff : right.batch_id.localeCompare(left.batch_id);
  });
}

export function validateCustomerReturnItems(
  items: readonly CustomerReturnItemInput[],
  allocations: readonly CustomerReturnAllocation[] = [],
): string | null {
  if (items.length === 0) {
    return "Minimal satu barang retur wajib diisi";
  }

  const usedBySaleItem = new Map<string, Prisma.Decimal>();
  const usedSaleItemIds = new Set<string>();

  for (const item of items) {
    const qty = toDecimal(item.qty);
    if (qty.lte(0)) {
      return "Jumlah retur harus lebih dari 0";
    }
    if (!Object.values(ReturnCondition).includes(item.condition)) {
      return "Kondisi barang retur tidak valid";
    }
    if (!item.variant_id || item.variant_id.trim() === "") {
      return "Varian barang retur wajib dipilih";
    }

    if (item.sale_item_id) {
      if (usedSaleItemIds.has(item.sale_item_id)) {
        return "Item transaksi tidak boleh duplikat dalam satu retur.";
      }
      usedSaleItemIds.add(item.sale_item_id);

      const available = allocations
        .filter((allocation) => allocation.sale_item_id === item.sale_item_id)
        .reduce(
          (sum, allocation) => sum.plus(allocationAvailability(allocation)),
          new Prisma.Decimal(0),
        );
      const used = usedBySaleItem.get(item.sale_item_id) ?? new Prisma.Decimal(0);
      if (qty.plus(used).gt(available)) {
        return "Jumlah retur melebihi sisa barang yang pernah terjual.";
      }
      usedBySaleItem.set(item.sale_item_id, qty.plus(used));
    } else if (item.condition === ReturnCondition.Layak_jual) {
      try {
        if (toMoney(item.unit_cost ?? BigInt(0)) < BigInt(0)) {
          return "HPP barang retur tidak boleh negatif.";
        }
      } catch (error) {
        return error instanceof Error ? error.message : "HPP tidak valid.";
      }
    }
  }

  return null;
}

export function planCustomerReturnRestorations(
  items: readonly CustomerReturnItemInput[],
  allocations: readonly CustomerReturnAllocation[] = [],
): CustomerReturnPlanItem[] {
  const validationError = validateCustomerReturnItems(items, allocations);
  if (validationError) throw new Error(validationError);

  const consumptionByAllocation = new Map<string, Prisma.Decimal>();

  return items.map((item) => {
    const qty = toDecimal(item.qty);
    const base = {
      item,
      condition: item.condition,
      qty,
      batch_restorations: [] as BatchRestoration[],
      restored_hpp: BigInt(0),
      damaged_qty: new Prisma.Decimal(0),
      new_batch_unit_cost: null as bigint | null,
    };

    if (item.condition === ReturnCondition.Rusak) {
      return { ...base, damaged_qty: qty };
    }

    if (!item.sale_item_id) {
      return { ...base, new_batch_unit_cost: toMoney(item.unit_cost ?? BigInt(0)) };
    }

    let remaining = qty;
    for (const allocation of sortLifo(
      allocations.filter(
        (candidate) => candidate.sale_item_id === item.sale_item_id,
      ),
    )) {
      if (remaining.lte(0)) break;

      const available = allocationAvailability(allocation).minus(
        consumptionByAllocation.get(allocation.batch_id) ?? new Prisma.Decimal(0),
      );
      if (available.lte(0)) continue;

      const restored = remaining.lt(available) ? remaining : available;
      const unitCost = toMoney(allocation.batch_unit_cost.toString());
      const subtotalHpp = roundToBigInt(
        toDecimal(unitCost.toString()).mul(restored),
      );

      base.batch_restorations.push({
        allocation_id: allocation.id,
        batch_id: allocation.batch_id,
        qty: restored,
        unit_cost: unitCost,
        subtotal_hpp: subtotalHpp,
      });
      base.restored_hpp += subtotalHpp;
      consumptionByAllocation.set(
        allocation.batch_id,
        (consumptionByAllocation.get(allocation.batch_id) ?? new Prisma.Decimal(0)).plus(
          restored,
        ),
      );
      remaining = remaining.minus(restored);
    }

    if (remaining.gt(0)) {
      throw new Error("Jumlah retur melebihi sisa barang yang pernah terjual.");
    }

    return base;
  });
}

export type CustomerRefundSaleItem = {
  sale_item_id: string;
  qty: DecimalInput;
  subtotal_amount: bigint | number | string;
};

export type CustomerRefundContext = {
  sale_discount_amount: bigint | number | string;
  items: readonly CustomerRefundSaleItem[];
};

export type CustomerRefundSelection = {
  sale_item_id: string;
  qty: DecimalInput;
};

export function calculateCustomerReturnRefund(
  selections: readonly CustomerRefundSelection[],
  context: CustomerRefundContext,
): bigint {
  const totalSubtotal = context.items.reduce(
    (sum, item) => sum + toMoney(item.subtotal_amount),
    BigInt(0),
  );
  if (totalSubtotal === BigInt(0)) return BigInt(0);

  const discount = toMoney(context.sale_discount_amount);
  let refund = BigInt(0);

  for (const selection of selections) {
    const saleItem = context.items.find(
      (item) => item.sale_item_id === selection.sale_item_id,
    );
    if (!saleItem) {
      throw new Error("Barang retur tidak ditemukan pada transaksi asal.");
    }

    const soldQty = toDecimal(saleItem.qty);
    if (soldQty.lte(0)) continue;

    const returnQty = toDecimal(selection.qty);
    const cappedQty = returnQty.gt(soldQty) ? soldQty : returnQty;
    const subtotal = toMoney(saleItem.subtotal_amount);
    const discountShare = roundToBigInt(
      toDecimal(discount.toString()).mul(subtotal.toString()).div(totalSubtotal.toString()),
    );
    const netSubtotal = subtotal - discountShare;

    refund += roundToBigInt(
      toDecimal(netSubtotal.toString()).mul(cappedQty).div(soldQty),
    );
  }

  return refund;
}
