import { SupplierReturnResolution } from "@prisma/client";
import Link from "next/link";
import {
  PageHeading,
  Panel,
  inputClass,
  primaryButtonClass,
} from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { SupplierReturnListItemView } from "./types";

export const instant = false;

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

type SearchParams = Promise<{
  q?: string;
  resolution_type?: string;
}>;

export default async function SupplierReturnsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const resolution = Object.values(SupplierReturnResolution).includes(
    params.resolution_type as SupplierReturnResolution,
  )
    ? (params.resolution_type as SupplierReturnResolution)
    : undefined;

  const where: {
    return_number?: { contains: string; mode: "insensitive" };
    resolution_type?: SupplierReturnResolution;
  } = {};
  if (query) where.return_number = { contains: query, mode: "insensitive" };
  if (resolution) where.resolution_type = resolution;

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
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/supplier-returns/new" className={primaryButtonClass}>
          Catat Retur Supplier
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Panel title="Jumlah Retur">
          <p className="text-2xl font-semibold text-zinc-900">{views.length}</p>
        </Panel>
        <Panel title="Total Nominal Retur">
          <p className="text-2xl font-semibold text-zinc-900">
            {formatRupiah(totalAmount)}
          </p>
        </Panel>
      </div>

      <Panel title="Daftar Retur Supplier" description="Maksimal 200 retur terbaru ditampilkan.">
        <form method="get" className="mb-5 grid gap-3 md:grid-cols-[2fr_1fr_auto]">
          <div>
            <label htmlFor="q" className="text-sm font-medium">
              Nomor Retur
            </label>
            <input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Cari nomor retur"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="resolution_type" className="text-sm font-medium">
              Penyelesaian
            </label>
            <select
              id="resolution_type"
              name="resolution_type"
              defaultValue={resolution ?? ""}
              className={inputClass}
            >
              <option value="">Semua</option>
              {Object.values(SupplierReturnResolution).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Filter
          </button>
        </form>

        {views.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
            Belum ada retur supplier yang cocok dengan filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={thClass}>Nomor</th>
                  <th className={thClass}>Tanggal</th>
                  <th className={thClass}>Pembelian</th>
                  <th className={thClass}>Penyelesaian</th>
                  <th className={thClass}>Nominal</th>
                  <th className={thClass}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {views.map((row) => (
                  <tr key={row.id}>
                    <td className={tdClass}>
                      <p className="font-medium text-zinc-900">{row.return_number}</p>
                      <p className="text-xs text-zinc-500">{row.reason}</p>
                    </td>
                    <td className={tdClass}>
                      {new Date(row.return_date).toLocaleDateString("id-ID")}
                    </td>
                    <td className={tdClass}>
                      <p>{row.purchase_number}</p>
                      <p className="text-xs text-zinc-500">{row.supplier_name}</p>
                    </td>
                    <td className={tdClass}>{row.resolution_type}</td>
                    <td className={tdClass}>
                      <p>{formatRupiah(row.return_amount)}</p>
                      <p className="text-xs text-zinc-500">
                        Otomatis {formatRupiah(row.calculated_return_amount)}
                      </p>
                    </td>
                    <td className={tdClass}>
                      <Link
                        href={`/supplier-returns/${row.id}`}
                        className="font-medium text-zinc-900 underline"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
