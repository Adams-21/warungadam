import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  Button,
  DateRangeFields,
  EmptyState,
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
import { buildDateBounds } from "@/lib/date-range";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { PurchaseTabs } from "./purchase-tabs";
import {
  PAYMENT_STATUSES,
  PURCHASE_STATUSES,
  paymentStatusLabel,
  purchaseStatusLabel,
  type PurchaseListItemView,
  type SupplierOptionView,
} from "./types";

export const instant = false;

type PurchasesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function PurchasesPage({
  searchParams,
}: PurchasesPageProps) {
  const query = await searchParams;
  const statusRaw = firstValue(query.status);
  const supplierRaw = firstValue(query.supplier_id);
  const paymentRaw = firstValue(query.payment_status);
  const dateFrom = firstValue(query.date_from);
  const dateTo = firstValue(query.date_to);

  const status = PURCHASE_STATUSES.includes(statusRaw as (typeof PURCHASE_STATUSES)[number])
    ? statusRaw
    : "";
  const paymentStatus = PAYMENT_STATUSES.includes(
    paymentRaw as (typeof PAYMENT_STATUSES)[number],
  )
    ? paymentRaw
    : "";

  const where: Prisma.PurchasesWhereInput = {};
  if (status) where.status = status as (typeof PURCHASE_STATUSES)[number];
  if (supplierRaw) where.supplier_id = supplierRaw;
  if (paymentStatus) {
    where.payment_status = paymentStatus as (typeof PAYMENT_STATUSES)[number];
  }
  const dateBounds = buildDateBounds(dateFrom, dateTo);
  if (dateBounds) where.purchase_date = dateBounds;

  const [rows, suppliers] = await Promise.all([
    prisma.purchases.findMany({
      where,
      orderBy: { purchase_date: "desc" },
      include: {
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.suppliers.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const supplierViews: SupplierOptionView[] = suppliers;
  const purchaseViews: PurchaseListItemView[] = rows.map((purchase) => ({
    id: purchase.id,
    purchase_number: purchase.purchase_number,
    supplier_name: purchase.supplier.name,
    purchase_date: purchase.purchase_date.toISOString(),
    total_amount: Number(purchase.total_amount),
    status: purchase.status,
    payment_status: purchase.payment_status,
    item_count: purchase._count.items,
  }));


  return (
    <>
      <PageHeading
        title="Pembelian"
        description="Kelola pesanan pembelian produk, penerimaan barang, dan pembayaran supplier."
        actions={
          <>
            <Link href="/purchases/new" className={primaryButtonClass}>
              Buat Pesanan Pembelian
            </Link>
            <Link href="/purchases/packaging" className={secondaryButtonClass}>
              Catat Pembelian Kemasan
            </Link>
          </>
        }
      />
      <PurchaseTabs active="orders" />

      <Panel title="Filter Pesanan" description="Sesuaikan daftar berdasarkan status, supplier, status pembayaran, atau tanggal.">
        <form method="get" className="grid gap-3 md:grid-cols-5">
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
              {PURCHASE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {purchaseStatusLabel(value)}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Label htmlFor="supplier_id" className="text-sm font-medium">
              Supplier
            </Label>
            <SelectField
              name="supplier_id"
              defaultValue={supplierRaw}
              id="supplier_id"
              className="mt-1 h-10 w-full bg-white"
            >
              <option value="">Semua supplier</option>
              {supplierViews.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Label htmlFor="payment_status" className="text-sm font-medium">
              Status pembayaran
            </Label>
            <SelectField
              name="payment_status"
              defaultValue={paymentStatus}
              id="payment_status"
              className="mt-1 h-10 w-full bg-white"
            >
              <option value="">Semua pembayaran</option>
              {PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {paymentStatusLabel(value)}
                </option>
              ))}
            </SelectField>
          </div>
          <DateRangeFields from={dateFrom} to={dateTo} />
          <div className="flex items-end">
            <Button type="submit" className={secondaryButtonClass}>
              Terapkan Filter
            </Button>
          </div>
        </form>
      </Panel>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-teal-50/40">
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nomor PO
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supplier
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tanggal
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status Penerimaan
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status Pembayaran
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Item
              </TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {purchaseViews.length === 0 ? (
              <TableRow className="hover:bg-teal-50/40">
                <TableCell
                  className="px-3 py-3 align-top text-sm text-slate-800"
                  colSpan={8}
                >
                  <EmptyState
                    compact
                    title="Belum ada pesanan pembelian"
                    description="Belum ada pesanan pembelian yang cocok dengan filter."
                  />
                </TableCell>
              </TableRow>
            ) : (
              purchaseViews.map((purchase) => (
                <TableRow key={purchase.id} className="hover:bg-teal-50/40">
                  <TableCell className="px-3 py-3 align-top text-sm font-medium text-slate-800">
                    {purchase.purchase_number}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {purchase.supplier_name}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {new Date(purchase.purchase_date).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {formatRupiah(purchase.total_amount)}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <StatusBadge status={purchase.status}>
                      {purchaseStatusLabel(purchase.status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <StatusBadge status={purchase.payment_status}>
                      {paymentStatusLabel(purchase.payment_status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {purchase.item_count}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <Link
                      href={`/purchases/${purchase.id}`}
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
