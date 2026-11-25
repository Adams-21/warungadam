import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PageHeading,
  Panel,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  secondaryButtonClass,
} from "@/components/ui";
import { formatNumber, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { uuidSchema } from "@/lib/schemas";
import type {
  SupplierReturnDetailItemView,
  SupplierReturnDetailView,
} from "../types";

export const instant = false;

export default async function SupplierReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const row = await prisma.supplierReturns.findUnique({
    where: { id },
    select: {
      id: true,
      return_number: true,
      return_date: true,
      resolution_type: true,
      calculated_return_amount: true,
      return_amount: true,
      settlement_date: true,
      reason: true,
      purchase: {
        select: {
          purchase_number: true,
          supplier: { select: { name: true } },
        },
      },
      items: {
        select: {
          id: true,
          qty: true,
          unit_price: true,
          subtotal: true,
          variant: {
            select: {
              name: true,
              product: { select: { name: true } },
              unit: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!row) notFound();

  const items: SupplierReturnDetailItemView[] = row.items.map((item) => ({
    id: item.id,
    variant_label: `${item.variant.product.name} - ${item.variant.name} (${item.variant.unit.name})`,
    qty: Number(item.qty),
    unit_price: Number(item.unit_price),
    subtotal: Number(item.subtotal),
  }));

  const detail: SupplierReturnDetailView = {
    id: row.id,
    return_number: row.return_number,
    purchase_number: row.purchase.purchase_number,
    supplier_name: row.purchase.supplier.name,
    return_date: row.return_date.toISOString(),
    resolution_type: row.resolution_type,
    calculated_return_amount: Number(row.calculated_return_amount),
    return_amount: Number(row.return_amount),
    settlement_date: row.settlement_date?.toISOString() ?? null,
    reason: row.reason,
    total_items: items.length,
    items,
  };

  return (
    <>
      <PageHeading
        title={`Retur Supplier ${detail.return_number}`}
        description={`Dari pembelian ${detail.purchase_number} · ${detail.supplier_name}.`}
        actions={
          <Link href="/supplier-returns" className={secondaryButtonClass}>
            Kembali ke Daftar Retur Supplier
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Panel title="Penyelesaian">
          <StatusBadge status={detail.resolution_type} />
        </Panel>
        <Panel title="Nominal Final">
          <p className="text-lg font-semibold text-slate-900">
            {formatRupiah(detail.return_amount)}
          </p>
          <p className="text-xs text-slate-500">
            Otomatis {formatRupiah(detail.calculated_return_amount)}
          </p>
        </Panel>
        <Panel title="Tanggal Realisasi">
          <p className="text-lg font-semibold text-slate-900">
            {detail.settlement_date
              ? new Date(detail.settlement_date).toLocaleDateString("id-ID")
              : "-"}
          </p>
        </Panel>
        <Panel title="Alasan">
          <p className="text-sm text-slate-800">{detail.reason}</p>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Barang Diretur">
          <Table className="min-w-full divide-y divide-slate-200">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-teal-50/40">
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Varian</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Harga Satuan</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-teal-50/40">
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{item.variant_label}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{formatNumber(item.qty)}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{formatRupiah(item.unit_price)}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{formatRupiah(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
