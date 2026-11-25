import { Prisma } from "@prisma/client";
import { roundToBigInt, toMoney, type DecimalInput } from "../purchases/purchase-rules";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type DashboardPeriod = {
  from: Date | string;
  to: Date | string;
  asOf?: Date | string;
};

export type DashboardSaleRecord = {
  id?: string;
  transaction_number?: string;
  transaction_date: Date | string;
  order_status?: string;
  payment_status?: string;
  settlement_status?: string;
  total_amount: bigint | number | string;
  product_cogs: bigint | number | string;
  packaging_cogs: bigint | number | string;
  admin_fee_estimate_amount: bigint | number | string;
  admin_fee_actual_amount?: bigint | number | string | null;
};

export type DashboardSaleCogsInput = {
  items: readonly {
    total_hpp_fifo: bigint | number | string;
    customer_return_items?: readonly {
      restored_hpp_amount: bigint | number | string;
    }[];
  }[];
  packaging_usages: readonly {
    calculated_hpp: bigint | number | string;
    adjusted_hpp?: bigint | number | string | null;
  }[];
};

export function calculateDashboardSaleCogs(input: DashboardSaleCogsInput): {
  product_cogs: bigint;
  packaging_cogs: bigint;
} {
  return {
    product_cogs: input.items.reduce((total, item) => {
      const restoredHpp = (item.customer_return_items ?? []).reduce(
        (sum, returnItem) => sum + toMoney(returnItem.restored_hpp_amount),
        BigInt(0),
      );
      return total + toMoney(item.total_hpp_fifo) - restoredHpp;
    }, BigInt(0)),
    packaging_cogs: input.packaging_usages.reduce(
      (total, usage) =>
        total + toMoney(usage.adjusted_hpp ?? usage.calculated_hpp),
      BigInt(0),
    ),
  };
}

export type DashboardRefundRecord = {
  refund_paid_date: Date | string | null;
  refund_amount: bigint | number | string;
  fund_status?: string;
};

export type DashboardExpenseRecord = {
  expense_date: Date | string;
  amount: bigint | number | string;
  is_void?: boolean;
};

export type DashboardWriteOffRecord = {
  created_at: Date | string;
  loss_value: bigint | number | string;
};

export type DashboardAssetBatchRecord = {
  remaining_qty: DecimalInput;
  unit_cost: bigint | number | string;
};

export type DashboardPackagingAssetRecord = {
  stock_qty: DecimalInput;
  average_unit_cost: DecimalInput;
};

export type DashboardLowStockRecord = {
  id: string;
  label: string;
  stock_qty: DecimalInput;
  min_stock: DecimalInput | null;
};

export type DashboardBillRecord = {
  id: string;
  purchase_number: string;
  supplier_name: string;
  purchase_date: Date | string;
  due_date: Date | string | null;
  remaining_amount: bigint | number | string;
};

export type DashboardKpis = {
  transaction_count: number;
  total_sales: bigint;
  product_cogs: bigint;
  packaging_cogs: bigint;
  total_cogs: bigint;
  admin_fee: bigint;
  refunds: bigint;
  net_revenue: bigint;
  gross_profit: bigint;
  operating_expenses: bigint;
  write_off_loss: bigint;
  net_profit: bigint;
  product_asset_value: bigint;
  packaging_asset_value: bigint;
  total_asset_value: bigint;
};

export type DashboardLowStockItem = {
  id: string;
  label: string;
  stock_qty: number;
  min_stock: number;
};

export type DashboardBill = {
  id: string;
  purchase_number: string;
  supplier_name: string;
  purchase_date: string;
  due_date: string | null;
  remaining_amount: bigint;
  is_overdue: boolean;
};

export type DashboardRecentSale = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  total_amount: bigint;
  order_status: string;
  payment_status: string;
  settlement_status: string;
};

export type DashboardTrendPoint = {
  key: string;
  label: string;
  total_sales: bigint;
  gross_profit: bigint;
  net_profit: bigint;
};

export type DashboardAggregation = {
  kpis: DashboardKpis;
  low_stock_products: DashboardLowStockItem[];
  low_stock_packaging: DashboardLowStockItem[];
  unpaid_bills: DashboardBill[];
  overdue_bills: DashboardBill[];
  recent_sales: DashboardRecentSale[];
  daily_trend: DashboardTrendPoint[];
  monthly_trend: DashboardTrendPoint[];
};

export type DashboardAggregationInput = {
  period: DashboardPeriod;
  sales: readonly DashboardSaleRecord[];
  refunds?: readonly DashboardRefundRecord[];
  expenses?: readonly DashboardExpenseRecord[];
  write_offs?: readonly DashboardWriteOffRecord[];
  product_batches?: readonly DashboardAssetBatchRecord[];
  packaging_materials?: readonly DashboardPackagingAssetRecord[];
  low_stock_products?: readonly DashboardLowStockRecord[];
  low_stock_packaging?: readonly DashboardLowStockRecord[];
  bills?: readonly DashboardBillRecord[];
};

type TrendBucket = {
  key: string;
  label: string;
  sales: bigint;
  cogs: bigint;
  admin_fee: bigint;
  refunds: bigint;
  expenses: bigint;
  write_offs: bigint;
};

function toDate(value: Date | string): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  if (DATE_ONLY_PATTERN.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function requireDate(value: Date | string, field: string): Date {
  const date = toDate(value);
  if (!date) throw new Error(`${field} tidak valid.`);
  return date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isWithin(date: Date, from: Date, to: Date): boolean {
  const key = dayKey(date);
  return key >= dayKey(from) && key <= dayKey(to);
}

function toNumber(value: DecimalInput | bigint): number {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return new Prisma.Decimal(value.toString()).toNumber();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function createDailyBuckets(from: Date, to: Date): Map<string, TrendBucket> {
  const buckets = new Map<string, TrendBucket>();
  let cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    const key = dayKey(cursor);
    buckets.set(key, {
      key,
      label: `${String(cursor.getDate()).padStart(2, "0")}/${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      sales: BigInt(0),
      cogs: BigInt(0),
      admin_fee: BigInt(0),
      refunds: BigInt(0),
      expenses: BigInt(0),
      write_offs: BigInt(0),
    });
    cursor = addDays(cursor, 1);
  }
  return buckets;
}

function createMonthlyBuckets(from: Date, to: Date): Map<string, TrendBucket> {
  const buckets = new Map<string, TrendBucket>();
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    const key = monthKey(cursor);
    buckets.set(key, {
      key,
      label: `${String(cursor.getMonth() + 1).padStart(2, "0")}/${cursor.getFullYear()}`,
      sales: BigInt(0),
      cogs: BigInt(0),
      admin_fee: BigInt(0),
      refunds: BigInt(0),
      expenses: BigInt(0),
      write_offs: BigInt(0),
    });
    cursor = addMonths(cursor, 1);
  }
  return buckets;
}

function applyToBuckets(
  buckets: Map<string, TrendBucket>,
  date: Date,
  patch: Partial<Omit<TrendBucket, "key" | "label">>,
): void {
  const keys = [dayKey(date), monthKey(date)];
  for (const key of keys) {
    const bucket = buckets.get(key);
    if (!bucket) continue;
    for (const [field, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      const current = bucket[field as keyof TrendBucket];
      if (typeof current === "bigint") {
        (bucket as unknown as Record<string, bigint>)[field] =
          current + toMoney(value.toString());
      }
    }
  }
}

function finalizeTrend(buckets: Map<string, TrendBucket>): DashboardTrendPoint[] {
  return [...buckets.values()].map((bucket) => {
    const netRevenue = bucket.sales - bucket.admin_fee - bucket.refunds;
    const grossProfit = netRevenue - bucket.cogs;
    return {
      key: bucket.key,
      label: bucket.label,
      total_sales: bucket.sales,
      gross_profit: grossProfit,
      net_profit: grossProfit - bucket.expenses - bucket.write_offs,
    };
  });
}

function collectLowStock(
  records: readonly DashboardLowStockRecord[],
): DashboardLowStockItem[] {
  return records
    .filter((record) => {
      if (record.min_stock === null || record.min_stock === undefined) return false;
      return new Prisma.Decimal(toNumber(record.stock_qty)).lte(
        new Prisma.Decimal(toNumber(record.min_stock)),
      );
    })
    .map((record) => ({
      id: record.id,
      label: record.label,
      stock_qty: toNumber(record.stock_qty),
      min_stock: toNumber(record.min_stock as DecimalInput),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "id"));
}

export function aggregateDashboard(
  input: DashboardAggregationInput,
): DashboardAggregation {
  const from = requireDate(input.period.from, "Tanggal awal periode");
  const to = requireDate(input.period.to, "Tanggal akhir periode");
  const fromDay = startOfDay(from);
  const toDay = startOfDay(to);
  if (fromDay > toDay) {
    throw new Error("Tanggal awal tidak boleh setelah tanggal akhir.");
  }
  const asOf = input.period.asOf
    ? requireDate(input.period.asOf, "Tanggal acuan")
    : new Date();
  const asOfDay = startOfDay(asOf);

  const dailyBuckets = createDailyBuckets(fromDay, toDay);
  const monthlyBuckets = createMonthlyBuckets(fromDay, toDay);

  let totalSales = BigInt(0);
  let productCogs = BigInt(0);
  let packagingCogs = BigInt(0);
  let adminFee = BigInt(0);
  let refunds = BigInt(0);
  let operatingExpenses = BigInt(0);
  let writeOffLoss = BigInt(0);
  let transactionCount = 0;

  const recentCandidates: DashboardRecentSale[] = [];

  for (const sale of input.sales) {
    const date = requireDate(sale.transaction_date, "Tanggal transaksi");
    if (!isWithin(date, fromDay, toDay)) continue;
    if (sale.order_status === "Dibatalkan") continue;

    const gross = toMoney(sale.total_amount);
    const saleProductCogs = toMoney(sale.product_cogs);
    const salePackagingCogs = toMoney(sale.packaging_cogs);
    const fee =
      sale.admin_fee_actual_amount !== null &&
      sale.admin_fee_actual_amount !== undefined
        ? toMoney(sale.admin_fee_actual_amount)
        : toMoney(sale.admin_fee_estimate_amount);

    totalSales += gross;
    productCogs += saleProductCogs;
    packagingCogs += salePackagingCogs;
    adminFee += fee;
    transactionCount += 1;

    const patch = {
      sales: gross,
      cogs: saleProductCogs + salePackagingCogs,
      admin_fee: fee,
    };
    applyToBuckets(dailyBuckets, date, patch);
    applyToBuckets(monthlyBuckets, date, patch);

    if (sale.id && sale.transaction_number) {
      recentCandidates.push({
        id: sale.id,
        transaction_number: sale.transaction_number,
        transaction_date: date.toISOString(),
        total_amount: gross,
        order_status: sale.order_status ?? "-",
        payment_status: sale.payment_status ?? "-",
        settlement_status: sale.settlement_status ?? "-",
      });
    }
  }

  for (const refund of input.refunds ?? []) {
    if (refund.fund_status && refund.fund_status !== "Dana_dikembalikan") continue;
    if (!refund.refund_paid_date) continue;
    const date = requireDate(refund.refund_paid_date, "Tanggal refund");
    if (!isWithin(date, fromDay, toDay)) continue;
    const amount = toMoney(refund.refund_amount);
    refunds += amount;
    applyToBuckets(dailyBuckets, date, { refunds: amount });
    applyToBuckets(monthlyBuckets, date, { refunds: amount });
  }

  for (const expense of input.expenses ?? []) {
    if (expense.is_void) continue;
    const date = requireDate(expense.expense_date, "Tanggal pengeluaran");
    if (!isWithin(date, fromDay, toDay)) continue;
    const amount = toMoney(expense.amount);
    operatingExpenses += amount;
    applyToBuckets(dailyBuckets, date, { expenses: amount });
    applyToBuckets(monthlyBuckets, date, { expenses: amount });
  }

  for (const writeOff of input.write_offs ?? []) {
    const date = requireDate(writeOff.created_at, "Tanggal penghapusan stok");
    if (!isWithin(date, fromDay, toDay)) continue;
    const amount = toMoney(writeOff.loss_value);
    writeOffLoss += amount;
    applyToBuckets(dailyBuckets, date, { write_offs: amount });
    applyToBuckets(monthlyBuckets, date, { write_offs: amount });
  }

  let productAssetValue = BigInt(0);
  for (const batch of input.product_batches ?? []) {
    productAssetValue += roundToBigInt(
      new Prisma.Decimal(toNumber(batch.remaining_qty).toString()).mul(
        batch.unit_cost.toString(),
      ),
    );
  }

  let packagingAssetValue = BigInt(0);
  for (const material of input.packaging_materials ?? []) {
    packagingAssetValue += roundToBigInt(
      new Prisma.Decimal(toNumber(material.stock_qty).toString()).mul(
        toNumber(material.average_unit_cost).toString(),
      ),
    );
  }

  const totalCogs = productCogs + packagingCogs;
  const netRevenue = totalSales - adminFee - refunds;
  const grossProfit = netRevenue - totalCogs;
  const netProfit = grossProfit - operatingExpenses - writeOffLoss;

  const bills: DashboardBill[] = (input.bills ?? [])
    .filter((bill) => toMoney(bill.remaining_amount) > BigInt(0))
    .map((bill) => {
      const dueDate = bill.due_date ? requireDate(bill.due_date, "Tanggal jatuh tempo") : null;
      return {
        id: bill.id,
        purchase_number: bill.purchase_number,
        supplier_name: bill.supplier_name,
        purchase_date: dayKey(requireDate(bill.purchase_date, "Tanggal pembelian")),
        due_date: dueDate ? dayKey(dueDate) : null,
        remaining_amount: toMoney(bill.remaining_amount),
        is_overdue: Boolean(dueDate && startOfDay(dueDate) < asOfDay),
      };
    })
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return a.purchase_number.localeCompare(b.purchase_number);
    });

  const recentSales = recentCandidates
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .slice(0, 5);

  return {
    kpis: {
      transaction_count: transactionCount,
      total_sales: totalSales,
      product_cogs: productCogs,
      packaging_cogs: packagingCogs,
      total_cogs: totalCogs,
      admin_fee: adminFee,
      refunds,
      net_revenue: netRevenue,
      gross_profit: grossProfit,
      operating_expenses: operatingExpenses,
      write_off_loss: writeOffLoss,
      net_profit: netProfit,
      product_asset_value: productAssetValue,
      packaging_asset_value: packagingAssetValue,
      total_asset_value: productAssetValue + packagingAssetValue,
    },
    low_stock_products: collectLowStock(input.low_stock_products ?? []),
    low_stock_packaging: collectLowStock(input.low_stock_packaging ?? []),
    unpaid_bills: bills,
    overdue_bills: bills.filter((bill) => bill.is_overdue),
    recent_sales: recentSales,
    daily_trend: finalizeTrend(dailyBuckets),
    monthly_trend: finalizeTrend(monthlyBuckets),
  };
}
