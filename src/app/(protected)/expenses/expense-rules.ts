import { toMoney } from "../purchases/purchase-rules";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: Date | string): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  if (!DATE_ONLY_PATTERN.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

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

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type ExpenseInput = {
  expense_category_id: string;
  expense_date: Date | string;
  amount: bigint | number | string;
  description: string;
};

export type ExpenseValidationContext = {
  validCategoryIds?: readonly string[];
};

export function validateExpenseInput(
  input: ExpenseInput,
  context: ExpenseValidationContext = {},
): string | null {
  if (typeof input.description !== "string" || input.description.trim() === "") {
    return "Nama/deskripsi pengeluaran wajib diisi";
  }
  if (input.description.trim().length > 500) {
    return "Deskripsi pengeluaran terlalu panjang";
  }

  if (
    typeof input.expense_category_id !== "string" ||
    input.expense_category_id.trim() === ""
  ) {
    return "Kategori pengeluaran wajib dipilih";
  }
  if (
    context.validCategoryIds &&
    !context.validCategoryIds.includes(input.expense_category_id)
  ) {
    return "Kategori pengeluaran tidak valid atau tidak aktif";
  }

  if (!toDate(input.expense_date)) {
    return "Tanggal pengeluaran tidak valid";
  }

  try {
    if (toMoney(input.amount) <= BigInt(0)) {
      return "Nominal pengeluaran harus lebih dari 0";
    }
  } catch (error) {
    return error instanceof Error ? error.message : "Nominal tidak valid";
  }

  return null;
}

export function validateExpenseCategoryName(name: string): string | null {
  if (typeof name !== "string" || name.trim() === "") {
    return "Nama kategori wajib diisi";
  }
  if (name.trim().length > 100) {
    return "Nama kategori terlalu panjang";
  }
  return null;
}

export function validateExpenseVoidReason(reason: string): string | null {
  if (typeof reason !== "string" || reason.trim() === "") {
    return "Alasan pembatalan wajib diisi";
  }
  if (reason.trim().length > 500) {
    return "Alasan pembatalan terlalu panjang";
  }
  return null;
}

export type ExpenseRecord = {
  expense_category_id: string;
  expense_date: Date | string;
  amount: bigint | number | string;
  is_void?: boolean;
  category_name?: string;
};

export type ExpenseAggregateFilter = {
  dateFrom?: Date | string;
  dateTo?: Date | string;
  categoryId?: string;
  includeVoid?: boolean;
};

export type ExpenseCategoryTotal = {
  category_id: string;
  category_name: string;
  count: number;
  total: bigint;
};

export type ExpenseAggregation = {
  count: number;
  total: bigint;
  byCategory: ExpenseCategoryTotal[];
};

export function aggregateExpenses(
  expenses: readonly ExpenseRecord[],
  filter: ExpenseAggregateFilter = {},
): ExpenseAggregation {
  const from = filter.dateFrom ? toDate(filter.dateFrom) : null;
  const to = filter.dateTo ? toDate(filter.dateTo) : null;

  if (filter.dateFrom && !from) {
    throw new Error("Tanggal awal periode tidak valid.");
  }
  if (filter.dateTo && !to) {
    throw new Error("Tanggal akhir periode tidak valid.");
  }

  const fromKey = from ? dateKey(from) : null;
  const toKey = to ? dateKey(to) : null;
  const grouped = new Map<string, ExpenseCategoryTotal>();
  let total = BigInt(0);
  let count = 0;

  for (const expense of expenses) {
    if (!filter.includeVoid && expense.is_void) continue;
    if (filter.categoryId && expense.expense_category_id !== filter.categoryId) {
      continue;
    }

    const date = toDate(expense.expense_date);
    if (!date) {
      throw new Error("Tanggal pengeluaran tidak valid.");
    }

    const key = dateKey(date);
    if (fromKey && key < fromKey) continue;
    if (toKey && key > toKey) continue;

    const amount = toMoney(expense.amount);
    if (amount <= BigInt(0)) {
      throw new Error("Nominal pengeluaran harus lebih dari 0.");
    }

    const categoryId = expense.expense_category_id;
    const categoryName = expense.category_name?.trim() || categoryId;
    const current =
      grouped.get(categoryId) ??
      { category_id: categoryId, category_name: categoryName, count: 0, total: BigInt(0) };

    current.count += 1;
    current.total += amount;
    grouped.set(categoryId, current);

    total += amount;
    count += 1;
  }

  const byCategory = [...grouped.values()].sort((a, b) => {
    if (a.total === b.total) {
      return a.category_name.localeCompare(b.category_name, "id");
    }
    return a.total > b.total ? -1 : 1;
  });

  return { count, total, byCategory };
}

export type ProfitLossInput = {
  totalRevenue: bigint | number | string;
  productCogs: bigint | number | string;
  packagingCogs: bigint | number | string;
  totalOperatingExpenses: bigint | number | string;
};

export type ProfitLossReport = {
  totalRevenue: bigint;
  totalCogs: bigint;
  grossProfit: bigint;
  totalOperatingExpenses: bigint;
  netProfit: bigint;
};

export function calculateProfitLoss(input: ProfitLossInput): ProfitLossReport {
  const totalRevenue = toMoney(input.totalRevenue);
  const productCogs = toMoney(input.productCogs);
  const packagingCogs = toMoney(input.packagingCogs);
  const totalOperatingExpenses = toMoney(input.totalOperatingExpenses);

  if (totalRevenue < BigInt(0)) {
    throw new Error("Total pendapatan tidak boleh negatif.");
  }
  if (productCogs < BigInt(0) || packagingCogs < BigInt(0)) {
    throw new Error("HPP tidak boleh negatif.");
  }
  if (totalOperatingExpenses < BigInt(0)) {
    throw new Error("Biaya operasional tidak boleh negatif.");
  }

  const totalCogs = productCogs + packagingCogs;
  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit - totalOperatingExpenses;

  return {
    totalRevenue,
    totalCogs,
    grossProfit,
    totalOperatingExpenses,
    netProfit,
  };
}
