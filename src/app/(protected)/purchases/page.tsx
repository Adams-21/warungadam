import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PageHeading, Panel, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
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

  const thClass =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
  const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

  return (
    <>
      <PageHeading
        title="Pembelian"
        description="Kelola pesanan pembelian produk, penerimaan barang, dan pembayaran supplier."
      />
      <PurchaseTabs active="orders" />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/purchases/new" className={primaryButtonClass}>
          Buat Pesanan Pembelian
        </Link>
        <Link href="/purchases/packaging" className={secondaryButtonClass}>
          Catat Pembelian Kemasan
        </Link>
      </div>

      <Panel title="Filter Pesanan" description="Sesuaikan daftar berdasarkan status, supplier, atau status pembayaran.">
        <form method="get" className="grid gap-3 md:grid-cols-4">
          <div>
            <label htmlFor="status" className="text-sm font-medium">
              Status pesanan
            </label>
            <select id="status" name="status" className={inputClass} defaultValue={status}>
              <option value="">Semua status</option>
              {PURCHASE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {purchaseStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="supplier_id" className="text-sm font-medium">
              Supplier
            </label>
            <select
              id="supplier_id"
              name="supplier_id"
              className={inputClass}
              defaultValue={supplierRaw}
            >
              <option value="">Semua supplier</option>
              {supplierViews.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="payment_status" className="text-sm font-medium">
              Status pembayaran
            </label>
            <select
              id="payment_status"
              name="payment_status"
              className={inputClass}
              defaultValue={paymentStatus}
            >
              <option value="">Semua pembayaran</option>
              {PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {paymentStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className={secondaryButtonClass}>
              Terapkan Filter
            </button>
          </div>
        </form>
      </Panel>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thClass}>Nomor PO</th>
              <th className={thClass}>Supplier</th>
              <th className={thClass}>Tanggal</th>
              <th className={thClass}>Total</th>
              <th className={thClass}>Status Penerimaan</th>
              <th className={thClass}>Status Pembayaran</th>
              <th className={thClass}>Item</th>
              <th className={thClass}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {purchaseViews.length === 0 ? (
              <tr>
                <td className={`${tdClass} text-center text-zinc-500`} colSpan={8}>
                  Belum ada pesanan pembelian yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              purchaseViews.map((purchase) => (
                <tr key={purchase.id}>
                  <td className={`${tdClass} font-medium`}>
                    {purchase.purchase_number}
                  </td>
                  <td className={tdClass}>{purchase.supplier_name}</td>
                  <td className={tdClass}>
                    {new Date(purchase.purchase_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className={tdClass}>{formatRupiah(purchase.total_amount)}</td>
                  <td className={tdClass}>{purchaseStatusLabel(purchase.status)}</td>
                  <td className={tdClass}>
                    {paymentStatusLabel(purchase.payment_status)}
                  </td>
                  <td className={tdClass}>{purchase.item_count}</td>
                  <td className={tdClass}>
                    <Link
                      href={`/purchases/${purchase.id}`}
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
