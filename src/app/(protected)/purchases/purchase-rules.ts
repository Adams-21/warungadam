import { Prisma } from "@prisma/client";
import { buildDateBounds } from "@/lib/date-range";
import { uuidSchema } from "@/lib/schemas";
import {
  PAYMENT_STATUSES,
  PURCHASE_STATUSES,
  type PaymentStatusValue,
  type PurchaseStatusValue,
} from "./types";

export type DecimalInput = Prisma.Decimal | number | string | bigint;

function toDecimal(value: DecimalInput): Prisma.Decimal {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(value.toString());
}

export function roundToBigInt(value: Prisma.Decimal): bigint {
  return BigInt(value.toDecimalPlaces(0).toFixed(0));
}

export function toMoney(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error("Nominal harus berupa bilangan bulat.");
    }
    return BigInt(value);
  }

  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error("Nominal harus berupa bilangan bulat.");
  }
  return BigInt(trimmed);
}

export function validatePurchaseDueDate(
  paymentType: string,
  dueDate: Date | null,
): string | null {
  if (paymentType === "TEMPO" && !dueDate) {
    return "Tanggal jatuh tempo wajib diisi untuk pembayaran tempo.";
  }
  return null;
}

export type PurchaseListFilter = {
  status: string;
  supplier_id: string;
  payment_status: string;
  date_from: string;
  date_to: string;
};

export function buildPurchaseListWhere(
  filter: PurchaseListFilter,
): Prisma.PurchasesWhereInput {
  const where: Prisma.PurchasesWhereInput = {};

  if (PURCHASE_STATUSES.some((value) => value === filter.status)) {
    where.status = filter.status as PurchaseStatusValue;
  }

  const supplierId = filter.supplier_id.trim();
  if (supplierId && uuidSchema.safeParse(supplierId).success) {
    where.supplier_id = supplierId;
  }

  if (PAYMENT_STATUSES.some((value) => value === filter.payment_status)) {
    where.payment_status = filter.payment_status as PaymentStatusValue;
  }

  const dateBounds = buildDateBounds(
    filter.date_from.trim(),
    filter.date_to.trim(),
  );
  if (dateBounds) {
    where.purchase_date = dateBounds;
  }

  return where;
}

export type PurchaseLine = {
  variant_id?: string;
  ordered_qty: DecimalInput;
  unit_price: bigint | number | string;
};

export function calculateItemSubtotal(
  line: Pick<PurchaseLine, "ordered_qty" | "unit_price">,
): bigint {
  return roundToBigInt(
    toDecimal(line.unit_price.toString()).mul(toDecimal(line.ordered_qty)),
  );
}

export function calculatePurchaseTotal(
  items: readonly PurchaseLine[],
): bigint {
  return items.reduce(
    (sum, item) => sum + calculateItemSubtotal(item),
    BigInt(0),
  );
}

export function validatePurchaseLines(
  items: readonly PurchaseLine[],
): string | null {
  if (items.length === 0) {
    return "Minimal satu item wajib diisi";
  }

  for (const item of items) {
    if (toDecimal(item.ordered_qty).lte(0)) {
      return "Jumlah pesanan harus lebih dari 0";
    }
    if (toMoney(item.unit_price.toString()) <= BigInt(0)) {
      return "Harga satuan harus lebih dari 0";
    }
  }

  const variantIds = items
    .map((item) => item.variant_id)
    .filter((id): id is string => typeof id === "string");
  if (variantIds.length > 0 && new Set(variantIds).size !== variantIds.length) {
    return "Varian tidak boleh duplikat dalam satu pesanan.";
  }

  return null;
}

export const PURCHASE_FULFILLMENT_STATUS = {
  CONFIRMED: "Dikonfirmasi",
  PARTIAL: "Diterima_sebagian",
  COMPLETED: "Diterima_seluruhnya",
} as const;

export type PurchaseFulfillmentStatus =
  (typeof PURCHASE_FULFILLMENT_STATUS)[keyof typeof PURCHASE_FULFILLMENT_STATUS];

export type ReceiptStatusLine = {
  ordered_qty: DecimalInput;
  received_qty: DecimalInput;
};

export function resolvePurchaseStatus(
  items: readonly ReceiptStatusLine[],
): PurchaseFulfillmentStatus {
  const hasReceipt = items.some((item) => toDecimal(item.received_qty).gt(0));
  if (!hasReceipt) {
    return PURCHASE_FULFILLMENT_STATUS.CONFIRMED;
  }

  const isComplete = items.every((item) =>
    toDecimal(item.received_qty).gte(toDecimal(item.ordered_qty)),
  );

  return isComplete
    ? PURCHASE_FULFILLMENT_STATUS.COMPLETED
    : PURCHASE_FULFILLMENT_STATUS.PARTIAL;
}

export function getRemainingQty(
  orderedQty: DecimalInput,
  receivedQty: DecimalInput,
): Prisma.Decimal {
  const remaining = toDecimal(orderedQty).minus(toDecimal(receivedQty));
  return remaining.lt(0) ? new Prisma.Decimal(0) : remaining;
}

export function validateReceivedQty(
  orderedQty: DecimalInput,
  alreadyReceivedQty: DecimalInput,
  incomingQty: DecimalInput,
): string | null {
  const incoming = toDecimal(incomingQty);
  if (incoming.lte(0)) {
    return "Jumlah diterima harus lebih dari 0.";
  }
  if (incoming.gt(getRemainingQty(orderedQty, alreadyReceivedQty))) {
    return "Jumlah diterima melebihi sisa pesanan pada salah satu item.";
  }
  return null;
}

export type FifoBatch = {
  id: string;
  received_at: Date | string;
  remaining_qty: DecimalInput;
  unit_cost: bigint | number | string;
};

export type FifoAllocation = {
  batch_id: string;
  received_at: Date;
  allocated_qty: Prisma.Decimal;
  unit_cost: bigint;
  subtotal_hpp: bigint;
};

export type FifoAllocationResult = {
  allocations: FifoAllocation[];
  total_hpp: bigint;
  remaining_qty: Prisma.Decimal;
};

export function allocateFifoBatches(
  batches: readonly FifoBatch[],
  requestedQty: DecimalInput,
): FifoAllocationResult {
  const requested = toDecimal(requestedQty);
  if (requested.lt(0)) {
    throw new Error("Jumlah yang diminta tidak boleh negatif.");
  }

  const sortedBatches = [...batches].sort((left, right) => {
    const dateDiff =
      new Date(left.received_at).getTime() -
      new Date(right.received_at).getTime();
    return dateDiff !== 0 ? dateDiff : left.id.localeCompare(right.id);
  });

  const allocations: FifoAllocation[] = [];
  let needed = requested;
  let totalHpp = BigInt(0);

  for (const batch of sortedBatches) {
    if (needed.lte(0)) break;

    const available = toDecimal(batch.remaining_qty);
    if (available.lte(0)) continue;

    const allocated = needed.lt(available) ? needed : available;
    const unitCost = toMoney(batch.unit_cost.toString());
    const subtotalHpp = roundToBigInt(
      toDecimal(unitCost.toString()).mul(allocated),
    );

    allocations.push({
      batch_id: batch.id,
      received_at: new Date(batch.received_at),
      allocated_qty: allocated,
      unit_cost: unitCost,
      subtotal_hpp: subtotalHpp,
    });
    totalHpp += subtotalHpp;
    needed = needed.minus(allocated);
  }

  if (needed.gt(0)) {
    throw new Error("Stok batch tidak mencukupi untuk jumlah yang diminta.");
  }

  return {
    allocations,
    total_hpp: totalHpp,
    remaining_qty: needed,
  };
}

export const SUPPLIER_PAYMENT_STATUS = {
  UNPAID: "Belum_dibayar",
  PARTIAL: "Sebagian",
  PAID: "Lunas",
} as const;

export type SupplierPaymentStatus =
  (typeof SUPPLIER_PAYMENT_STATUS)[keyof typeof SUPPLIER_PAYMENT_STATUS];

export type PurchasePaymentState = {
  paid_amount: bigint;
  remaining_amount: bigint;
  status?: string;
};

export type SupplierPaymentResult = {
  paid_amount: bigint;
  remaining_amount: bigint;
  payment_status: SupplierPaymentStatus;
};

export function validateSupplierPayment(
  purchase: PurchasePaymentState,
  amount: bigint,
): string | null {
  if (amount <= BigInt(0)) {
    return "Nominal harus lebih dari 0";
  }
  if (purchase.remaining_amount <= BigInt(0)) {
    return "Tagihan pesanan ini sudah lunas.";
  }
  if (amount > purchase.remaining_amount) {
    return "Nominal pembayaran melebihi sisa tagihan.";
  }
  return null;
}

export function resolveSupplierPayment(
  purchase: PurchasePaymentState,
  amount: bigint,
): SupplierPaymentResult {
  const error = validateSupplierPayment(purchase, amount);
  if (error) throw new Error(error);

  const remainingAmount = purchase.remaining_amount - amount;
  return {
    paid_amount: purchase.paid_amount + amount,
    remaining_amount: remainingAmount,
    payment_status:
      remainingAmount === BigInt(0)
        ? SUPPLIER_PAYMENT_STATUS.PAID
        : SUPPLIER_PAYMENT_STATUS.PARTIAL,
  };
}

export type SupplierPaymentAmount = {
  amount: DecimalInput;
  is_void?: boolean;
};

export function calculatePaidAmount(
  payments: readonly SupplierPaymentAmount[],
): bigint {
  return payments.reduce((sum, payment) => {
    if (payment.is_void) return sum;
    return sum + toMoney(payment.amount.toString());
  }, BigInt(0));
}

export function resolveSupplierPaymentTotals(
  totalAmount: bigint,
  paidAmount: bigint | null,
): SupplierPaymentResult {
  const rawPaid = paidAmount ?? BigInt(0);
  const paid =
    rawPaid < BigInt(0)
      ? BigInt(0)
      : rawPaid > totalAmount
        ? totalAmount
        : rawPaid;
  const remainingAmount = totalAmount - paid;

  return {
    paid_amount: paid,
    remaining_amount: remainingAmount,
    payment_status:
      remainingAmount === BigInt(0)
        ? SUPPLIER_PAYMENT_STATUS.PAID
        : paid === BigInt(0)
          ? SUPPLIER_PAYMENT_STATUS.UNPAID
          : SUPPLIER_PAYMENT_STATUS.PARTIAL,
  };
}

export function convertPurchaseToUsageQty(
  purchaseQty: DecimalInput,
  conversionFactor: DecimalInput,
): Prisma.Decimal {
  const qty = toDecimal(purchaseQty);
  const factor = toDecimal(conversionFactor);
  if (qty.lte(0) || factor.lte(0)) {
    throw new Error(
      "Jumlah beli dan faktor konversi kemasan harus lebih dari 0.",
    );
  }
  return qty.mul(factor);
}

export type WeightedAverageInput = {
  currentStock: DecimalInput;
  currentAverageCost: DecimalInput;
  purchaseSubtotal: bigint;
  usageQty: DecimalInput;
};

export function calculateWeightedAverageUnitCost(
  input: WeightedAverageInput,
): Prisma.Decimal {
  const currentStock = toDecimal(input.currentStock);
  const currentAverageCost = toDecimal(input.currentAverageCost);
  const usageQty = toDecimal(input.usageQty);
  const nextStock = currentStock.plus(usageQty);

  if (nextStock.lte(0)) {
    return currentAverageCost;
  }

  return currentStock
    .mul(currentAverageCost)
    .plus(toDecimal(input.purchaseSubtotal.toString()))
    .div(nextStock)
    .toDecimalPlaces(4);
}
