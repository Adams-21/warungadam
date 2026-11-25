import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  Button,
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
  secondaryButtonClass,
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
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

  return (
    <>
      <PageHeading
        title="Penjualan"
        description="Catat transaksi offline dan marketplace, pantau stok yang terpotong, serta lihat HPP dan laba kotor."
        actions={
          <Link href="/sales/new" className={primaryButtonClass}>
            Catat Penjualan
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="Jumlah Transaksi">
          <p className="text-2xl font-semibold text-slate-900">
            {saleViews.length}
          </p>
        </Panel>
        <Panel title="Penjualan Bruto">
          <p className="text-xl font-semibold text-slate-900">
            {formatRupiah(Number(totalRevenue))}
          </p>
        </Panel>
        <Panel title="Total HPP">
          <p className="text-xl font-semibold text-slate-900">
            {formatRupiah(Number(totalCogs))}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Produk {formatRupiah(Number(totalProductCogs))} · Kemasan{" "}
            {formatRupiah(Number(totalPackagingCogs))}
          </p>
        </Panel>
        <Panel title="Laba Kotor">
          <p className="text-xl font-semibold text-slate-900">
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
              <Label htmlFor="q" className="text-sm font-medium">
                Pencarian
              </Label>
              <Input
                id="q"
                name="q"
                defaultValue={search}
                placeholder="No. transaksi / resi"
                className="mt-1 h-10 bg-white"
              />
            </div>
            <div>
              <Label htmlFor="sales_channel_id" className="text-sm font-medium">
                Kanal
              </Label>
              <SelectField
                name="sales_channel_id"
                defaultValue={channelRaw}
                id="sales_channel_id"
                className="mt-1 h-10 w-full bg-white"
              >
                <option value="">Semua kanal</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <Label htmlFor="status" className="text-sm font-medium">
                Status pesanan
              </Label>
              <SelectField
                name="status"
                defaultValue={status}
                id="status"
                className="mt-1 h-10 w-full bg-white"
              >
                <option value="">Semua status</option>
                {SALE_ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {saleOrderStatusLabel(value)}
                  </option>
                ))}
              </SelectField>
            </div>
            <DateRangeFields from={dateFrom} to={dateTo} />
            <div className="flex items-end">
              <Button type="submit" className={secondaryButtonClass}>
                Filter
              </Button>
            </div>
          </form>
        </Panel>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-teal-50/40">
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                No. Transaksi
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tanggal
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Kanal
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                HPP Produk
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                HPP Kemasan
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Laba Kotor
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {saleViews.length === 0 ? (
              <TableRow className="hover:bg-teal-50/40">
                <TableCell
                  className="px-3 py-3 align-top text-sm text-slate-800"
                  colSpan={9}
                >
                  <EmptyState
                    compact
                    title="Belum ada transaksi"
                    description="Belum ada transaksi yang cocok dengan filter."
                  />
                </TableCell>
              </TableRow>
            ) : (
              saleViews.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-teal-50/40">
                  <TableCell className="px-3 py-3 align-top text-sm font-medium text-slate-800">
                    {sale.transaction_number}
                    {sale.external_order_number ? (
                      <span className="mt-1 block text-xs text-slate-500">
                        {sale.external_order_number}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {new Date(sale.transaction_date).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {sale.channel_name}
                    {sale.package_size_name ? (
                      <span className="mt-1 block text-xs text-slate-500">
                        Paket {sale.package_size_name}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {formatRupiah(sale.total_amount)}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {formatRupiah(sale.product_cogs)}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {formatRupiah(sale.packaging_cogs)}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {formatRupiah(sale.gross_profit)}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={sale.order_status}>
                        {saleOrderStatusLabel(sale.order_status)}
                      </StatusBadge>
                      <StatusBadge status={sale.payment_status}>
                        {salePaymentStatusLabel(sale.payment_status)}
                      </StatusBadge>
                      <StatusBadge status={sale.settlement_status}>
                        {saleSettlementStatusLabel(sale.settlement_status)}
                      </StatusBadge>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <Link
                      href={`/sales/${sale.id}`}
                      className="font-medium text-slate-900 underline"
                    >
                      Detail
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
