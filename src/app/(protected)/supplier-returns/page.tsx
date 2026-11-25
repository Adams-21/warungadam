import { SupplierReturnResolution } from "@prisma/client";
import Link from "next/link";
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
} from "@/components/ui";
import { SelectField } from "@/components/select-field";
import { buildDateBounds } from "@/lib/date-range";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { SupplierReturnListItemView } from "./types";

export const instant = false;

type SearchParams = Promise<{
  q?: string;
  resolution_type?: string;
  date_from?: string;
  date_to?: string;
}>;

export default async function SupplierReturnsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const dateFrom = params.date_from ?? "";
  const dateTo = params.date_to ?? "";
  const resolution = Object.values(SupplierReturnResolution).includes(
    params.resolution_type as SupplierReturnResolution,
  )
    ? (params.resolution_type as SupplierReturnResolution)
    : undefined;

  const where: {
    return_number?: { contains: string; mode: "insensitive" };
    resolution_type?: SupplierReturnResolution;
    return_date?: { gte?: Date; lte?: Date };
  } = {};
  if (query) where.return_number = { contains: query, mode: "insensitive" };
  if (resolution) where.resolution_type = resolution;
  const dateBounds = buildDateBounds(dateFrom, dateTo);
  if (dateBounds) where.return_date = dateBounds;

  const rows = await prisma.supplierReturns.findMany({
    where,
    orderBy: { return_date: "desc" },
    take: 200,
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
      _count: { select: { items: true } },
    },
  });

  const views: SupplierReturnListItemView[] = rows.map((row) => ({
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
    total_items: row._count.items,
  }));

  const totalAmount = views.reduce((sum, row) => sum + row.return_amount, 0);

  return (
    <>
      <PageHeading
        title="Retur Supplier"
        description="Catat pengembalian barang ke supplier dan dampaknya pada stok serta tagihan."
        actions={
          <Link href="/supplier-returns/new" className={primaryButtonClass}>
            Catat Retur Supplier
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Panel title="Jumlah Retur">
          <p className="text-2xl font-semibold text-slate-900">{views.length}</p>
        </Panel>
        <Panel title="Total Nominal Retur">
          <p className="text-2xl font-semibold text-slate-900">
            {formatRupiah(totalAmount)}
          </p>
        </Panel>
      </div>

      <Panel title="Daftar Retur Supplier" description="Maksimal 200 retur terbaru ditampilkan.">
        <form method="get" className="mb-5 grid gap-3 md:grid-cols-[2fr_1fr_2fr_auto]">
          <div>
            <Label htmlFor="q" className="text-sm font-medium">
              Nomor Retur
            </Label>
            <Input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Cari nomor retur"
              className="mt-1 h-10 bg-white"
            />
          </div>
          <div>
            <Label htmlFor="resolution_type" className="text-sm font-medium">
              Penyelesaian
            </Label>
            <SelectField
              name="resolution_type"
              defaultValue={resolution ?? ""}
              id="resolution_type"
              className="mt-1 h-10 w-full bg-white"
              placeholder="Semua"
            >
              <option value="">Semua</option>
              {Object.values(SupplierReturnResolution).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectField>
          </div>
          <DateRangeFields from={dateFrom} to={dateTo} />
          <Button type="submit" className="self-end rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            Filter
          </Button>
        </form>

        {views.length === 0 ? (
          <EmptyState
            compact
            title="Belum ada retur supplier"
            description="Belum ada retur supplier yang cocok dengan filter."
          />
        ) : (
          <Table className="min-w-full divide-y divide-slate-200">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-teal-50/40">
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nomor</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pembelian</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Penyelesaian</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nominal</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {views.map((row) => (
                <TableRow key={row.id} className="hover:bg-teal-50/40">
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <p className="font-medium text-slate-900">{row.return_number}</p>
                    <p className="text-xs text-slate-500">{row.reason}</p>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {new Date(row.return_date).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <p>{row.purchase_number}</p>
                    <p className="text-xs text-slate-500">{row.supplier_name}</p>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <StatusBadge status={row.resolution_type} />
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <p>{formatRupiah(row.return_amount)}</p>
                    <p className="text-xs text-slate-500">
                      Otomatis {formatRupiah(row.calculated_return_amount)}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <Link
                      href={`/supplier-returns/${row.id}`}
                      className="font-medium text-slate-900 underline"
                    >
                      Detail
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
