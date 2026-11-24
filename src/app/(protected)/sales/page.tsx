import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  PageHeading,
  Panel,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  SALE_ORDER_STATUSES,
  saleOrderStatusLabel,
  salePaymentStatusLabel,
  saleSettlementStatusLabel,
  type SaleListItemView,
} from "./types";

export const instant = false;

type SalesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function packagingCogsOf(
  usages: readonly { calculated_hpp: bigint; adjusted_hpp: bigint | null }[],
): bigint {
  return usages.reduce(
    (sum, usage) => sum + (usage.adjusted_hpp ?? usage.calculated_hpp),
    BigInt(0),
  );
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const query = await searchParams;
  const search = firstValue(query.q).trim();
  const channelRaw = firstValue(query.sales_channel_id);
  const statusRaw = firstValue(query.status);
  const dateFrom = firstValue(query.date_from);
  const dateTo = firstValue(query.date_to);

  const status = SALE_ORDER_STATUSES.includes(
    statusRaw as (typeof SALE_ORDER_STATUSES)[number],
  )
    ? statusRaw
    : "";

  const where: Prisma.SalesWhereInput = {};
  if (search) {
    where.OR = [
      { transaction_number: { contains: search, mode: "insensitive" } },
      { external_order_number: { contains: search, mode: "insensitive" } },
    ];
  }
  if (channelRaw) where.sales_channel_id = channelRaw;
  if (status) where.order_status = status as (typeof SALE_ORDER_STATUSES)[number];
  if (dateFrom || dateTo) {
    where.transaction_date = {
      ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
    };
  }

  const [rows, channels] = await Promise.all([
    prisma.sales.findMany({
      where,
      orderBy: { transaction_date: "desc" },
      include: {
        sales_channel: { select: { name: true } },
        package_size: { select: { name: true } },
        items: { select: { total_hpp_fifo: true } },
        packaging_usages: {
          select: { calculated_hpp: true, adjusted_hpp: true },
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.salesChannels.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const aggregated = rows.reduce<{
    views: SaleListItemView[];
    totalRevenue: bigint;
    totalProductCogs: bigint;
    totalPackagingCogs: bigint;
  }>(
    (acc, sale) => {
      const productCogs = sale.items.reduce(
        (sum, item) => sum + item.total_hpp_fifo,
        BigInt(0),
      );
      const packagingCogs = packagingCogsOf(sale.packaging_usages);
      const saleTotalCogs = productCogs + packagingCogs;

      const view: SaleListItemView = {
        id: sale.id,
        transaction_number: sale.transaction_number,
        transaction_date: sale.transaction_date.toISOString(),
        channel_name: sale.sales_channel.name,
        external_order_number: sale.external_order_number ?? "",
        package_size_name: sale.package_size?.name ?? "",
        total_amount: Number(sale.total_amount),
        product_cogs: Number(productCogs),
        packaging_cogs: Number(packagingCogs),
        total_cogs: Number(saleTotalCogs),
        gross_profit: Number(sale.total_amount - saleTotalCogs),
        order_status: sale.order_status,
        payment_status: sale.payment_status,
        settlement_status: sale.settlement_status,
        item_count: sale._count.items,
      };

      return {
        views: [...acc.views, view],
        totalRevenue: acc.totalRevenue + sale.total_amount,
        totalProductCogs: acc.totalProductCogs + productCogs,
        totalPackagingCogs: acc.totalPackagingCogs + packagingCogs,
      };
    },
    {
      views: [],
      totalRevenue: BigInt(0),
      totalProductCogs: BigInt(0),
      totalPackagingCogs: BigInt(0),
    },
  );

  const saleViews = aggregated.views;
  const totalRevenue = aggregated.totalRevenue;
  const totalProductCogs = aggregated.totalProductCogs;
  const totalPackagingCogs = aggregated.totalPackagingCogs;
  const totalCogs = totalProductCogs + totalPackagingCogs;
  const thClass =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
  const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

  return (
    <>
      <PageHeading
        title="Penjualan"
        description="Catat transaksi offline dan marketplace, pantau stok yang terpotong, serta lihat HPP dan laba kotor."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/sales/new" className={primaryButtonClass}>
          Catat Penjualan
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="Jumlah Transaksi">
          <p className="text-2xl font-semibold text-zinc-900">
            {saleViews.length}
          </p>
        </Panel>
        <Panel title="Penjualan Bruto">
          <p className="text-xl font-semibold text-zinc-900">
            {formatRupiah(Number(totalRevenue))}
          </p>
        </Panel>
        <Panel title="Total HPP">
          <p className="text-xl font-semibold text-zinc-900">
            {formatRupiah(Number(totalCogs))}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Produk {formatRupiah(Number(totalProductCogs))} · Kemasan{" "}
            {formatRupiah(Number(totalPackagingCogs))}
          </p>
        </Panel>
        <Panel title="Laba Kotor">
          <p className="text-xl font-semibold text-zinc-900">
            {formatRupiah(Number(totalRevenue - totalCogs))}
          </p>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Filter Transaksi"
          description="Saring berdasarkan nomor, kanal, status pesanan, atau tanggal."
        >
          <form method="get" className="grid gap-3 md:grid-cols-5">
            <div>
              <label htmlFor="q" className="text-sm font-medium">
                Pencarian
              </label>
              <input
                id="q"
                name="q"
                defaultValue={search}
                placeholder="No. transaksi / resi"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="sales_channel_id" className="text-sm font-medium">
                Kanal
              </label>
              <select
                id="sales_channel_id"
                name="sales_channel_id"
                defaultValue={channelRaw}
                className={inputClass}
              >
                <option value="">Semua kanal</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="text-sm font-medium">
                Status pesanan
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className={inputClass}
              >
                <option value="">Semua status</option>
                {SALE_ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {saleOrderStatusLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date_from" className="text-sm font-medium">
                Dari tanggal
              </label>
              <input
                id="date_from"
                name="date_from"
                type="date"
                defaultValue={dateFrom}
                className={inputClass}
              />
            </div>
            <div className="flex items-end gap-2">
              <input
                id="date_to"
                name="date_to"
                type="date"
                defaultValue={dateTo}
                aria-label="Sampai tanggal"
                className={inputClass}
              />
              <button type="submit" className={secondaryButtonClass}>
                Filter
              </button>
            </div>
          </form>
        </Panel>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thClass}>No. Transaksi</th>
              <th className={thClass}>Tanggal</th>
              <th className={thClass}>Kanal</th>
              <th className={thClass}>Total</th>
              <th className={thClass}>HPP Produk</th>
              <th className={thClass}>HPP Kemasan</th>
              <th className={thClass}>Laba Kotor</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {saleViews.length === 0 ? (
              <tr>
                <td
                  className={`${tdClass} text-center text-zinc-500`}
                  colSpan={9}
                >
                  Belum ada transaksi yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              saleViews.map((sale) => (
                <tr key={sale.id}>
                  <td className={`${tdClass} font-medium`}>
                    {sale.transaction_number}
                    {sale.external_order_number ? (
                      <span className="mt-1 block text-xs text-zinc-500">
                        {sale.external_order_number}
                      </span>
                    ) : null}
                  </td>
                  <td className={tdClass}>
                    {new Date(sale.transaction_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className={tdClass}>
                    {sale.channel_name}
                    {sale.package_size_name ? (
                      <span className="mt-1 block text-xs text-zinc-500">
                        Paket {sale.package_size_name}
                      </span>
                    ) : null}
                  </td>
                  <td className={tdClass}>{formatRupiah(sale.total_amount)}</td>
                  <td className={tdClass}>
                    {formatRupiah(sale.product_cogs)}
                  </td>
                  <td className={tdClass}>
                    {formatRupiah(sale.packaging_cogs)}
                  </td>
                  <td className={tdClass}>{formatRupiah(sale.gross_profit)}</td>
                  <td className={tdClass}>
                    <span className="block">{saleOrderStatusLabel(sale.order_status)}</span>
                    <span className="block text-xs text-zinc-500">
                      {salePaymentStatusLabel(sale.payment_status)}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {saleSettlementStatusLabel(sale.settlement_status)}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <Link
                      href={`/sales/${sale.id}`}
                      className="font-medium text-zinc-900 underline"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
