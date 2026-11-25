import {
  EmptyState,
  PageHeading,
  Panel,
  StatCard,
  StatusBadge,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { formatNumber, formatRupiah } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardChart } from "./dashboard-chart";
import { DashboardFilter } from "./dashboard-filter";
import {
  aggregateDashboard,
  calculateDashboardSaleCogs,
} from "./dashboard-rules";

export const instant = false;

type SearchParams = Promise<{
  date_from?: string;
  date_to?: string;
  granularity?: string;
}>;

function parseInputDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
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

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const today = new Date();

  const requestedFrom = parseInputDate(params.date_from) ?? today;
  const requestedTo = parseInputDate(params.date_to) ?? today;
  const from =
    requestedFrom <= requestedTo ? requestedFrom : requestedTo;
  const to = requestedFrom <= requestedTo ? requestedTo : requestedFrom;
  const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toNextDay = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
  const granularity = params.granularity === "monthly" ? "monthly" : "daily";
  const fromValue = toInputDate(from);
  const toValue = toInputDate(to);
  const dateRange = { gte: fromStart, lt: toNextDay };

  const [settings, sales, refunds, expenses, writeOffs, productBatches, packagingMaterials, lowStockProducts, lowStockPackaging, bills] =
    await Promise.all([
      prisma.businessSettings.findFirst({
        orderBy: { updated_at: "desc" },
        select: { business_name: true, address: true, phone: true },
      }),
      prisma.sales.findMany({
        where: {
          transaction_date: dateRange,
          order_status: { not: "Dibatalkan" },
        },
        orderBy: { transaction_date: "desc" },
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
          items: {
            select: {
              total_hpp_fifo: true,
              customer_return_items: {
                select: { restored_hpp_amount: true },
              },
            },
          },
          packaging_usages: {
            select: { calculated_hpp: true, adjusted_hpp: true },
          },
        },
      }),
      prisma.customerReturns.findMany({
        where: {
          refund_paid_date: dateRange,
          fund_status: "Dana_dikembalikan",
        },
        select: { refund_paid_date: true, refund_amount: true },
      }),
      prisma.expenses.findMany({
        where: { expense_date: dateRange, is_void: false },
        select: { expense_date: true, amount: true, is_void: true },
      }),
      prisma.stockWriteOffs.findMany({
        where: { created_at: dateRange },
        select: { created_at: true, loss_value: true },
      }),
      prisma.stockBatches.findMany({
        select: { remaining_qty: true, unit_cost: true },
      }),
      prisma.packagingMaterials.findMany({
        where: { is_active: true },
        select: { stock_qty: true, average_unit_cost: true },
      }),
      prisma.productVariants.findMany({
        where: { is_active: true, min_stock: { not: null } },
        orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          stock_qty: true,
          min_stock: true,
          product: { select: { name: true } },
          unit: { select: { name: true } },
        },
      }),
      prisma.packagingMaterials.findMany({
        where: { is_active: true, min_stock: { not: null } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          stock_qty: true,
          min_stock: true,
          purchase_unit: { select: { name: true } },
        },
      }),
      prisma.purchases.findMany({
        where: { remaining_amount: { gt: 0 } },
        orderBy: { due_date: "asc" },
        select: {
          id: true,
          purchase_number: true,
          purchase_date: true,
          due_date: true,
          remaining_amount: true,
          supplier: { select: { name: true } },
        },
      }),
    ]);

  const dashboard = aggregateDashboard({
    period: { from: fromStart, to, asOf: today },
    sales: sales.map((sale) => {
      const cogs = calculateDashboardSaleCogs(sale);
      return {
        id: sale.id,
        transaction_number: sale.transaction_number,
        transaction_date: sale.transaction_date,
        order_status: sale.order_status,
        payment_status: sale.payment_status,
        settlement_status: sale.settlement_status,
        total_amount: sale.total_amount,
        product_cogs: cogs.product_cogs,
        packaging_cogs: cogs.packaging_cogs,
        admin_fee_estimate_amount: sale.admin_fee_estimate_amount,
        admin_fee_actual_amount: sale.admin_fee_actual_amount,
      };
    }),
    refunds,
    expenses,
    write_offs: writeOffs,
    product_batches: productBatches,
    packaging_materials: packagingMaterials,
    low_stock_products: lowStockProducts.map((variant) => ({
      id: variant.id,
      label: `${variant.product.name} - ${variant.name} (${variant.unit.name})`,
      stock_qty: variant.stock_qty,
      min_stock: variant.min_stock,
    })),
    low_stock_packaging: lowStockPackaging.map((material) => ({
      id: material.id,
      label: `${material.name} (${material.purchase_unit.name})`,
      stock_qty: material.stock_qty,
      min_stock: material.min_stock,
    })),
    bills: bills.map((bill) => ({
      id: bill.id,
      purchase_number: bill.purchase_number,
      supplier_name: bill.supplier.name,
      purchase_date: bill.purchase_date,
      due_date: bill.due_date,
      remaining_amount: bill.remaining_amount,
    })),
  });

  const kpis = dashboard.kpis;
  const kpiCards = [
    {
      label: "Total Penjualan",
      value: formatRupiah(Number(kpis.total_sales)),
      note: `${formatNumber(kpis.transaction_count)} transaksi aktif`,
      tone: "default" as const,
    },
    {
      label: "Pemasukan Bersih",
      value: formatRupiah(Number(kpis.net_revenue)),
      note: `Admin ${formatRupiah(Number(kpis.admin_fee))}`,
      tone: "info" as const,
    },
    {
      label: "Total HPP",
      value: formatRupiah(Number(kpis.total_cogs)),
      note: `Produk ${formatRupiah(Number(kpis.product_cogs))} · Kemasan ${formatRupiah(Number(kpis.packaging_cogs))}`,
      tone: "default" as const,
    },
    {
      label: "Laba Kotor",
      value: formatRupiah(Number(kpis.gross_profit)),
      note: "Pemasukan bersih dikurangi HPP",
      tone: (kpis.gross_profit >= BigInt(0) ? "success" : "danger") as
        | "success"
        | "danger",
    },
    {
      label: "Biaya Operasional",
      value: formatRupiah(Number(kpis.operating_expenses)),
      note: "Pengeluaran aktif di luar HPP",
      tone: "warning" as const,
    },
    {
      label: "Laba Bersih",
      value: formatRupiah(Number(kpis.net_profit)),
      note:
        kpis.write_off_loss > BigInt(0)
          ? `Termasuk penghapusan ${formatRupiah(Number(kpis.write_off_loss))}`
          : "Setelah biaya operasional",
      tone: (kpis.net_profit >= BigInt(0) ? "success" : "danger") as
        | "success"
        | "danger",
    },
    {
      label: "Total Nilai Aset Persediaan",
      value: formatRupiah(Number(kpis.total_asset_value)),
      note: `Produk ${formatRupiah(Number(kpis.product_asset_value))} · Kemasan ${formatRupiah(Number(kpis.packaging_asset_value))}`,
      tone: "default" as const,
    },
    {
      label: "Potongan Refund",
      value: formatRupiah(Number(kpis.refunds)),
      note: "Refund pelanggan sudah dibayar",
      tone: "danger" as const,
    },
  ];

  const trendPoints =
    granularity === "daily" ? dashboard.daily_trend : dashboard.monthly_trend;

  return (
    <>
      <PageHeading
        title="Dashboard Analitik"
        description="Pantau penjualan, HPP, laba, aset persediaan, stok menipis, dan tagihan supplier pada periode terpilih."
        actions={
          <>
            <Link href="/sales/new" className={primaryButtonClass}>
              + Penjualan Baru
            </Link>
            <Link href="/purchases/new" className={secondaryButtonClass}>
              + Pembelian PO
            </Link>
            <Link href="/expenses" className={secondaryButtonClass}>
              + Biaya Operasional
            </Link>
          </>
        }
      />

      <Panel
        title="Filter Periode"
        description={`Periode ${fromValue} s/d ${toValue} · tren ${granularity === "daily" ? "harian" : "bulanan"}`}
      >
        <DashboardFilter
          from={fromValue}
          to={toValue}
          granularity={granularity}
        />
      </Panel>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            note={card.note}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="mt-6">
        <Panel
          title="Tren Penjualan vs Laba"
          description="Perbandingan total penjualan, laba kotor, dan laba bersih periode terpilih."
        >
          <DashboardChart points={trendPoints} granularity={granularity} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Peringatan Stok Menipis"
          description="Produk dan kemasan dengan stok di bawah atau sama dengan batas minimum."
        >
          <div className="mb-4 flex justify-end">
            <Link href="/purchases/new" className={secondaryButtonClass}>
              Buat PO
            </Link>
          </div>

          <h3 className="text-sm font-semibold text-slate-800">Produk</h3>
          {dashboard.low_stock_products.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                compact
                title="Semua stok produk aman"
                description="Tidak ada varian produk di bawah batas minimum."
              />
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {dashboard.low_stock_products.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-amber-700">
                      Stok {formatNumber(item.stock_qty)} · Min. {formatNumber(item.min_stock)}
                    </p>
                  </div>
                  <Link
                    href="/purchases/new"
                    className="shrink-0 text-xs font-medium text-slate-900 underline"
                  >
                    Pesan
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-5 text-sm font-semibold text-slate-800">Kemasan</h3>
          {dashboard.low_stock_packaging.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                compact
                title="Semua stok kemasan aman"
                description="Tidak ada kemasan di bawah batas minimum."
              />
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {dashboard.low_stock_packaging.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-amber-700">
                      Stok {formatNumber(item.stock_qty)} · Min. {formatNumber(item.min_stock)}
                    </p>
                  </div>
                  <Link
                    href="/purchases/new"
                    className="shrink-0 text-xs font-medium text-slate-900 underline"
                  >
                    Pesan
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Tagihan Supplier"
          description={`${formatNumber(dashboard.overdue_bills.length)} jatuh tempo · ${formatNumber(dashboard.unpaid_bills.length)} belum lunas.`}
        >
          {dashboard.unpaid_bills.length === 0 ? (
            <EmptyState
              compact
              title="Tidak ada tagihan belum lunas"
              description="Semua pembelian sudah lunas."
            />
          ) : (
            <ul className="space-y-2">
              {dashboard.unpaid_bills.map((bill) => (
                <li
                  key={bill.id}
                  className="rounded-md border border-slate-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {bill.purchase_number}
                      </p>
                      <p className="text-xs text-slate-500">{bill.supplier_name}</p>
                    </div>
                    <StatusBadge
                      status={bill.is_overdue ? "Jatuh tempo" : "Belum lunas"}
                      tone={bill.is_overdue ? "danger" : "warning"}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatRupiah(Number(bill.remaining_amount))}
                    </p>
                    <Link
                      href={`/purchases/${bill.id}`}
                      className="text-xs font-medium text-slate-900 underline"
                    >
                      Lihat PO
                    </Link>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Jatuh tempo {bill.due_date ?? "tidak ditentukan"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="5 Transaksi Penjualan Terakhir"
          description={`Transaksi aktif pada periode ${fromValue} s/d ${toValue}.`}
        >
          {dashboard.recent_sales.length === 0 ? (
            <EmptyState
              compact
              title="Belum ada transaksi"
              description="Catat penjualan baru untuk mengisi panel ini."
              action={
                <Link href="/sales/new" className={secondaryButtonClass}>
                  + Penjualan Baru
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {dashboard.recent_sales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {sale.transaction_number}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(sale.transaction_date).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={sale.order_status} />
                    <p className="text-sm font-semibold text-slate-900">
                      {formatRupiah(Number(sale.total_amount))}
                    </p>
                    <Link
                      href={`/sales/${sale.id}`}
                      className="text-xs font-medium text-slate-900 underline"
                    >
                      Detail
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Informasi Bisnis & Sesi Aktif">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Nama bisnis</dt>
              <dd className="font-medium text-slate-900">
                {settings?.business_name ?? "BizManage"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Alamat</dt>
              <dd className="text-slate-900">{settings?.address ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Telepon</dt>
              <dd className="text-slate-900">{settings?.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Pengguna aktif</dt>
              <dd className="text-slate-900">
                {user.username} · {user.role}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </>
  );
}
