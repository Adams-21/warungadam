import { Prisma } from "@prisma/client";
import {
  Button,
  Card,
  DateRangeFields,
  EmptyState,
  Input,
  Label,
  PageHeading,
  Panel,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  primaryButtonClass,
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { requireAuth } from "@/lib/auth";
import { toDateInputValue } from "@/lib/date-range";
import { formatNumber, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { resolveExpenseDateFilter } from "./expense-filter-helpers";
import {
  ExpenseCategoryManager,
  ExpenseFormModal,
  VoidExpenseModal,
} from "./expense-manager";
import { aggregateExpenses } from "./expense-rules";
import { calculateExpenseProfit } from "./expense-profit-helpers";
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
  const dateFilter = resolveExpenseDateFilter(rawDateFrom, rawDateTo, {
    from: defaultFrom,
    to: today,
  });
  const queryRange = dateFilter.error
    ? { gte: new Date(0), lte: new Date(0) }
    : {
        gte: dateFilter.bounds?.gte ?? defaultFrom,
        lte: dateFilter.bounds?.lte ?? today,
      };
  const filters: ExpenseFilterValues = {
    q: (firstValue(params.q) ?? "").trim(),
    category_id: selectedCategoryId,
    date_from: toDateInputValue(dateFilter.from),
    date_to: toDateInputValue(dateFilter.to),
    include_void: firstValue(params.include_void) === "1",
  };

  const expenseWhere: Prisma.ExpensesWhereInput = {
    ...(dateFilter.error
      ? { id: { in: [] } }
      : { expense_date: { gte: queryRange.gte, lte: queryRange.lte } }),
    ...(filters.q
      ? { description: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
    ...(filters.category_id
      ? { expense_category_id: filters.category_id }
      : {}),
    ...(filters.include_void ? {} : { is_void: false }),
  };

  const [expensesRaw, periodExpensesRaw, sales, refunds, writeOffs] =
    await Promise.all([
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
          expense_date: { gte: queryRange.gte, lte: queryRange.lte },
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
        where: { transaction_date: { gte: queryRange.gte, lte: queryRange.lte } },
        select: {
          id: true,
          transaction_number: true,
          transaction_date: true,
          order_status: true,
          payment_status: true,
          settlement_status: true,
          total_amount: true,
          admin_fee_estimate_amount: true,
          admin_fee_actual_amount: true,
          items: { select: { total_hpp_fifo: true } },
          packaging_usages: {
            select: { calculated_hpp: true, adjusted_hpp: true },
          },
        },
      }),
      prisma.customerReturns.findMany({
        where: {
          refund_paid_date: { gte: queryRange.gte, lte: queryRange.lte },
          fund_status: "Dana_dikembalikan",
        },
        select: {
          refund_paid_date: true,
          refund_amount: true,
          fund_status: true,
        },
      }),
      prisma.stockWriteOffs.findMany({
        where: { created_at: { gte: queryRange.gte, lte: queryRange.lte } },
        select: { created_at: true, loss_value: true },
      }),
    ]);

  const expenseViews: ExpenseView[] = expensesRaw.map((expense) => ({
    id: expense.id,
    expense_date: toDateInputValue(expense.expense_date),
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
      amount: expense.amount.toString(),
      is_void: expense.is_void,
      category_name: expense.expense_category.name,
    })),
    { dateFrom: queryRange.gte, dateTo: queryRange.lte },
  );

  const profit = calculateExpenseProfit({
    from: queryRange.gte,
    to: queryRange.lte,
    sales: sales.map((sale) => ({
      id: sale.id,
      transaction_number: sale.transaction_number,
      transaction_date: sale.transaction_date,
      order_status: sale.order_status,
      payment_status: sale.payment_status,
      settlement_status: sale.settlement_status,
      total_amount: sale.total_amount.toString(),
      admin_fee_estimate_amount: sale.admin_fee_estimate_amount.toString(),
      admin_fee_actual_amount: sale.admin_fee_actual_amount?.toString() ?? null,
      items: sale.items.map((item) => ({
        total_hpp_fifo: item.total_hpp_fifo.toString(),
      })),
      packaging_usages: sale.packaging_usages.map((usage) => ({
        calculated_hpp: usage.calculated_hpp.toString(),
        adjusted_hpp: usage.adjusted_hpp?.toString() ?? null,
      })),
    })),
    refunds: refunds.map((refund) => ({
      refund_paid_date: refund.refund_paid_date,
      refund_amount: refund.refund_amount.toString(),
      fund_status: refund.fund_status,
    })),
    expenses: periodExpensesRaw.map((expense) => ({
      expense_date: expense.expense_date,
      amount: expense.amount.toString(),
      is_void: expense.is_void,
    })),
    writeOffs: writeOffs.map((writeOff) => ({
      created_at: writeOff.created_at,
      loss_value: writeOff.loss_value.toString(),
    })),
  });

  const summary: ExpenseSummaryView = {
    totalRevenue: Number(profit.totalRevenue),
    productCogs: Number(profit.productCogs),
    packagingCogs: Number(profit.packagingCogs),
    totalCogs: Number(profit.totalCogs),
    grossProfit: Number(profit.grossProfit),
    totalOperatingExpenses: Number(profit.totalOperatingExpenses),
    netProfit: Number(profit.netProfit),
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
    { label: "Pendapatan Penjualan", value: summary.totalRevenue, tone: "text-slate-900" },
    { label: "Total HPP", value: summary.totalCogs, tone: "text-slate-900" },
    { label: "Laba Kotor", value: summary.grossProfit, tone: "text-slate-900" },
    {
      label: "Total Biaya Operasional",
      value: summary.totalOperatingExpenses,
      tone: "text-slate-900",
    },
    {
      label: "Laba Bersih",
      value: summary.netProfit,
      tone: summary.netProfit < 0 ? "text-rose-600" : "text-green-700",
    },
  ];


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
          <Card
            key={card.label}
            className="border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-600">{card.label}</p>
            <p className={`mt-2 text-lg font-semibold tabular-nums ${card.tone}`}>
              {formatRupiah(card.value)}
            </p>
          </Card>
        ))}
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Periode {filters.date_from} s/d {filters.date_to} · HPP produk{" "}
        {formatRupiah(summary.productCogs)} · HPP kemasan{" "}
        {formatRupiah(summary.packagingCogs)}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Admin {formatRupiah(Number(profit.adminFee))} · Refund dibayar{" "}
        {formatRupiah(Number(profit.refunds))} · Penghapusan stok{" "}
        {formatRupiah(Number(profit.writeOffLoss))}
      </p>
      {dateFilter.error ? (
        <p className="mt-1 text-sm text-rose-600">{dateFilter.error}</p>
      ) : null}

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
              <Input
                name="q"
                defaultValue={filters.q}
                placeholder="Cari deskripsi..."
                className="mt-1 h-10 bg-white"
              />
              <SelectField
                name="category_id"
                defaultValue={filters.category_id}
                className="mt-1 h-10 w-full bg-white"
              >
                <option value="">Semua kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              <DateRangeFields
                from={filters.date_from}
                to={filters.date_to}
              />
              <div className="flex items-center gap-3">
                <Label className="flex items-center gap-2 text-sm text-slate-700">
                  <Input
                    type="checkbox"
                    name="include_void"
                    value="1"
                    defaultChecked={filters.include_void}
                  />
                  Tampilkan void
                </Label>
                <Button type="submit" className={primaryButtonClass}>
                  Filter
                </Button>
              </div>
            </form>
          </div>

          <Table>
              <TableHeader>
                <TableRow className="hover:bg-teal-50/40">
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</TableHead>
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</TableHead>
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Deskripsi</TableHead>
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nominal</TableHead>
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {expenseViews.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-teal-50/40">
                    <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{expense.expense_date}</TableCell>
                    <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{expense.category_name}</TableCell>
                    <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-xs text-slate-500">
                        {expense.created_by}
                      </p>
                      {expense.is_void ? (
                        <p className="text-xs text-rose-600">
                          {expense.void_reason} · {expense.voided_by ?? "-"}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-3 py-3 align-top text-sm font-medium text-slate-800">
                      {formatRupiah(expense.amount)}
                    </TableCell>
                    <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                      <StatusBadge
                        status={expense.is_void ? "Void" : "Aktif"}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                      {expense.can_manage ? (
                        <div className="flex gap-2">
                          <ExpenseFormModal
                            categories={activeCategories}
                            expense={expense}
                          />
                          <VoidExpenseModal expense={expense} />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {expenseViews.length === 0 ? (
                  <TableRow className="hover:bg-teal-50/40">
                    <TableCell className="px-3 py-3 align-top text-sm text-slate-800" colSpan={6}>
                      <EmptyState
                        compact
                        title="Tidak ada pengeluaran"
                        description="Tidak ada pengeluaran pada filter ini."
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
          </Table>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Breakdown Pengeluaran per Kategori"
          description="Dihitung dari pengeluaran aktif pada periode terpilih."
        >
          <Table>
              <TableHeader>
                <TableRow className="hover:bg-teal-50/40">
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</TableHead>
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah Catatan</TableHead>
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Total</TableHead>
                  <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Persentase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {breakdown.map((item) => {
                  const percentage =
                    periodAggregation.total === BigInt(0)
                      ? 0
                      : Number(
                          (BigInt(item.total) * BigInt(10000)) /
                            periodAggregation.total,
                        ) / 100;
                  return (
                    <TableRow key={item.category_id} className="hover:bg-teal-50/40">
                      <TableCell className="px-3 py-3 align-top text-sm font-medium text-slate-800">
                        {item.category_name}
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{item.count}</TableCell>
                      <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{formatRupiah(item.total)}</TableCell>
                      <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                        {formatNumber(percentage, 2)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {breakdown.length === 0 ? (
                  <TableRow className="hover:bg-teal-50/40">
                    <TableCell className="px-3 py-3 align-top text-sm text-slate-800" colSpan={4}>
                      <EmptyState
                        compact
                        title="Belum ada pengeluaran aktif"
                        description="Belum ada pengeluaran aktif pada periode ini."
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
