import { Prisma } from "@prisma/client";
import {
  DateRangeFields,
  EmptyState,
  PageHeading,
  Panel,
  StatusBadge,
  inputClass,
  primaryButtonClass,
} from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { formatNumber, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  ExpenseCategoryManager,
  ExpenseFormModal,
  VoidExpenseModal,
} from "./expense-manager";
import { aggregateExpenses, calculateProfitLoss } from "./expense-rules";
import type {
  ExpenseCategoryTotalView,
  ExpenseCategoryView,
  ExpenseFilterValues,
  ExpenseSummaryView,
  ExpenseView,
} from "./types";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateBoundary(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);

  const categoriesRaw = await prisma.expenseCategories.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, is_active: true },
  });

  const categoryRawId = firstValue(params.category_id) ?? "";
  const selectedCategoryId = categoriesRaw.some(
    (category) => category.id === categoryRawId,
  )
    ? categoryRawId
    : "";

  const rawDateFrom = (firstValue(params.date_from) ?? "").trim();
  const rawDateTo = (firstValue(params.date_to) ?? "").trim();
  const fromDate =
    parseDateBoundary(rawDateFrom, false) ?? defaultFrom;
  const toDate = parseDateBoundary(rawDateTo, true) ?? today;
  const filters: ExpenseFilterValues = {
    q: (firstValue(params.q) ?? "").trim(),
    category_id: selectedCategoryId,
    date_from: toInputDate(fromDate),
    date_to: toInputDate(toDate),
    include_void: firstValue(params.include_void) === "1",
  };

  const expenseWhere: Prisma.ExpensesWhereInput = {
    expense_date: { gte: fromDate, lte: toDate },
    ...(filters.q
      ? { description: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
    ...(filters.category_id
      ? { expense_category_id: filters.category_id }
      : {}),
    ...(filters.include_void ? {} : { is_void: false }),
  };

  const [expensesRaw, periodExpensesRaw, sales] = await Promise.all([
    prisma.expenses.findMany({
      where: expenseWhere,
      include: {
        expense_category: { select: { name: true } },
        created_by: { select: { username: true } },
        voided_by: { select: { username: true } },
      },
      orderBy: [{ expense_date: "desc" }, { created_at: "desc" }],
    }),
    prisma.expenses.findMany({
      where: {
        is_void: false,
        expense_date: { gte: fromDate, lte: toDate },
      },
      select: {
        expense_category_id: true,
        expense_date: true,
        amount: true,
        is_void: true,
        expense_category: { select: { name: true } },
      },
    }),
    prisma.sales.findMany({
      where: { transaction_date: { gte: fromDate, lte: toDate } },
      select: {
        total_amount: true,
        items: { select: { total_hpp_fifo: true } },
        packaging_usages: { select: { calculated_hpp: true } },
      },
    }),
  ]);

  const expenseViews: ExpenseView[] = expensesRaw.map((expense) => ({
    id: expense.id,
    expense_date: toInputDate(expense.expense_date),
    amount: Number(expense.amount),
    description: expense.description,
    is_void: expense.is_void,
    void_reason: expense.void_reason,
    voided_by: expense.voided_by?.username ?? null,
    category_id: expense.expense_category_id,
    category_name: expense.expense_category.name,
    created_by: expense.created_by.username,
    created_at: expense.created_at.toISOString(),
    can_manage: !expense.is_void && expense.created_by_id === user.id,
  }));

  const categories: ExpenseCategoryView[] = categoriesRaw.map((category) => ({
    id: category.id,
    name: category.name,
    is_active: category.is_active,
  }));
  const activeCategories = categories.filter((category) => category.is_active);

  const periodAggregation = aggregateExpenses(
    periodExpensesRaw.map((expense) => ({
      expense_category_id: expense.expense_category_id,
      expense_date: expense.expense_date,
      amount: expense.amount,
      is_void: expense.is_void,
      category_name: expense.expense_category.name,
    })),
    { dateFrom: fromDate, dateTo: toDate },
  );

  const salesTotals = sales.reduce(
    (acc, sale) => ({
      totalRevenue: acc.totalRevenue + sale.total_amount,
      productCogs:
        acc.productCogs +
        sale.items.reduce(
          (sum, item) => sum + item.total_hpp_fifo,
          BigInt(0),
        ),
      packagingCogs:
        acc.packagingCogs +
        sale.packaging_usages.reduce(
          (sum, usage) => sum + usage.calculated_hpp,
          BigInt(0),
        ),
    }),
    {
      totalRevenue: BigInt(0),
      productCogs: BigInt(0),
      packagingCogs: BigInt(0),
    },
  );

  const profitLoss = calculateProfitLoss({
    totalRevenue: salesTotals.totalRevenue,
    productCogs: salesTotals.productCogs,
    packagingCogs: salesTotals.packagingCogs,
    totalOperatingExpenses: periodAggregation.total,
  });

  const summary: ExpenseSummaryView = {
    totalRevenue: Number(profitLoss.totalRevenue),
    productCogs: Number(salesTotals.productCogs),
    packagingCogs: Number(salesTotals.packagingCogs),
    totalCogs: Number(profitLoss.totalCogs),
    grossProfit: Number(profitLoss.grossProfit),
    totalOperatingExpenses: Number(profitLoss.totalOperatingExpenses),
    netProfit: Number(profitLoss.netProfit),
  };

  const breakdown: ExpenseCategoryTotalView[] = periodAggregation.byCategory.map(
    (item) => ({
      category_id: item.category_id,
      category_name: item.category_name,
      count: item.count,
      total: Number(item.total),
    }),
  );

  const summaryCards = [
    { label: "Pendapatan Penjualan", value: summary.totalRevenue, tone: "text-zinc-900" },
    { label: "Total HPP", value: summary.totalCogs, tone: "text-zinc-900" },
    { label: "Laba Kotor", value: summary.grossProfit, tone: "text-zinc-900" },
    {
      label: "Total Biaya Operasional",
      value: summary.totalOperatingExpenses,
      tone: "text-zinc-900",
    },
    {
      label: "Laba Bersih",
      value: summary.netProfit,
      tone: summary.netProfit < 0 ? "text-red-600" : "text-green-700",
    },
  ];

  const thClass =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
  const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

  return (
    <>
      <PageHeading
        title="Pengeluaran & Laba Bersih"
        description="Catat biaya operasional, pantau pengeluaran per kategori, dan lihat laba bersih periode terpilih."
        actions={
          <ExpenseFormModal
            categories={activeCategories}
            label="Tambah Pengeluaran"
            className={primaryButtonClass}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-zinc-600">{card.label}</p>
            <p className={`mt-2 text-lg font-semibold ${card.tone}`}>
              {formatRupiah(card.value)}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-2 text-sm text-zinc-600">
        Periode {filters.date_from} s/d {filters.date_to} · HPP produk{" "}
        {formatRupiah(summary.productCogs)} · HPP kemasan{" "}
        {formatRupiah(summary.packagingCogs)}
      </p>

      <div className="mt-6">
        <Panel
          title="Kategori Pengeluaran"
          description="Kategori dapat ditambah, diubah namanya, atau dinonaktifkan."
        >
          <ExpenseCategoryManager categories={categories} />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Riwayat Pengeluaran"
          description={`${expenseViews.length} catatan pada filter ini. Void tidak dihitung dalam total.`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <form
              method="get"
              className="grid w-full gap-3 md:grid-cols-4"
            >
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Cari deskripsi..."
                className={inputClass}
              />
              <select
                name="category_id"
                defaultValue={filters.category_id}
                className={inputClass}
              >
                <option value="">Semua kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <DateRangeFields
                from={filters.date_from}
                to={filters.date_to}
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    name="include_void"
                    value="1"
                    defaultChecked={filters.include_void}
                  />
                  Tampilkan void
                </label>
                <button type="submit" className={primaryButtonClass}>
                  Filter
                </button>
              </div>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead>
                <tr>
                  <th className={thClass}>Tanggal</th>
                  <th className={thClass}>Kategori</th>
                  <th className={thClass}>Deskripsi</th>
                  <th className={thClass}>Nominal</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {expenseViews.map((expense) => (
                  <tr key={expense.id}>
                    <td className={tdClass}>{expense.expense_date}</td>
                    <td className={tdClass}>{expense.category_name}</td>
                    <td className={tdClass}>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-xs text-zinc-500">
                        {expense.created_by}
                      </p>
                      {expense.is_void ? (
                        <p className="text-xs text-red-600">
                          {expense.void_reason} · {expense.voided_by ?? "-"}
                        </p>
                      ) : null}
                    </td>
                    <td className={`${tdClass} font-medium`}>
                      {formatRupiah(expense.amount)}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge
                        status={expense.is_void ? "Void" : "Aktif"}
                      />
                    </td>
                    <td className={tdClass}>
                      {expense.can_manage ? (
                        <div className="flex gap-2">
                          <ExpenseFormModal
                            categories={activeCategories}
                            expense={expense}
                          />
                          <VoidExpenseModal expense={expense} />
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {expenseViews.length === 0 ? (
                  <tr>
                    <td className={tdClass} colSpan={6}>
                      <EmptyState
                        compact
                        title="Tidak ada pengeluaran"
                        description="Tidak ada pengeluaran pada filter ini."
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Breakdown Pengeluaran per Kategori"
          description="Dihitung dari pengeluaran aktif pada periode terpilih."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead>
                <tr>
                  <th className={thClass}>Kategori</th>
                  <th className={thClass}>Jumlah Catatan</th>
                  <th className={thClass}>Total</th>
                  <th className={thClass}>Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {breakdown.map((item) => {
                  const percentage =
                    periodAggregation.total === BigInt(0)
                      ? 0
                      : Number(
                          (BigInt(item.total) * BigInt(10000)) /
                            periodAggregation.total,
                        ) / 100;
                  return (
                    <tr key={item.category_id}>
                      <td className={`${tdClass} font-medium`}>
                        {item.category_name}
                      </td>
                      <td className={tdClass}>{item.count}</td>
                      <td className={tdClass}>{formatRupiah(item.total)}</td>
                      <td className={tdClass}>
                        {formatNumber(percentage, 2)}%
                      </td>
                    </tr>
                  );
                })}
                {breakdown.length === 0 ? (
                  <tr>
                    <td className={tdClass} colSpan={4}>
                      <EmptyState
                        compact
                        title="Belum ada pengeluaran aktif"
                        description="Belum ada pengeluaran aktif pada periode ini."
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
