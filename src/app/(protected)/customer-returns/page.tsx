import {
  ReturnClaimStatus,
  ReturnFundStatus,
} from "@prisma/client";
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
import { humanizeStatusLabel } from "@/lib/status-labels";
import { prisma } from "@/lib/prisma";
import { firstValue } from "./customer-return-rules";
import type { CustomerReturnListItemView } from "./types";

export const instant = false;

type SearchParams = Promise<{
  q?: string | string[];
  claim_status?: string | string[];
  fund_status?: string | string[];
  date_from?: string | string[];
  date_to?: string | string[];
}>;

export default async function CustomerReturnsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = firstValue(params.q)?.trim() ?? "";
  const dateFrom = firstValue(params.date_from) ?? "";
  const dateTo = firstValue(params.date_to) ?? "";
  const claimRaw = firstValue(params.claim_status);
  const fundRaw = firstValue(params.fund_status);
  const claimStatus =
    claimRaw && Object.values(ReturnClaimStatus).includes(claimRaw as ReturnClaimStatus)
      ? (claimRaw as ReturnClaimStatus)
      : undefined;
  const fundStatus =
    fundRaw && Object.values(ReturnFundStatus).includes(fundRaw as ReturnFundStatus)
      ? (fundRaw as ReturnFundStatus)
      : undefined;

  const where: {
    return_number?: { contains: string; mode: "insensitive" };
    claim_status?: ReturnClaimStatus;
    fund_status?: ReturnFundStatus;
    return_date?: { gte?: Date; lte?: Date };
  } = {};
  if (query) where.return_number = { contains: query, mode: "insensitive" };
  if (claimStatus) where.claim_status = claimStatus;
  if (fundStatus) where.fund_status = fundStatus;
  const dateBounds = buildDateBounds(dateFrom, dateTo);
  if (dateBounds) where.return_date = dateBounds;

  const returns = await prisma.customerReturns.findMany({
    where,
    orderBy: { return_date: "desc" },
    take: 200,
    select: {
      id: true,
      return_number: true,
      return_date: true,
      reason: true,
      claim_status: true,
      fund_status: true,
      refund_amount: true,
      original_sale: { select: { transaction_number: true } },
      _count: { select: { items: true } },
    },
  });

  const views: CustomerReturnListItemView[] = returns.map((row) => ({
    id: row.id,
    return_number: row.return_number,
    original_sale_number: row.original_sale?.transaction_number ?? null,
    return_date: row.return_date.toISOString(),
    reason: row.reason,
    claim_status: row.claim_status,
    fund_status: row.fund_status,
    refund_amount: Number(row.refund_amount),
    total_items: row._count.items,
  }));

  const totalRefund = views.reduce((sum, row) => sum + row.refund_amount, 0);

  return (
    <>
      <PageHeading
        title="Retur Pelanggan"
        description="Kelola barang kembali dari pelanggan, pemulihan stok, dan pengembalian dana."
        actions={
          <Link href="/customer-returns/new" className={primaryButtonClass}>
            Catat Retur Baru
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Panel title="Jumlah Retur">
          <p className="text-2xl font-semibold text-slate-900">{views.length}</p>
        </Panel>
        <Panel title="Total Dana Retur">
          <p className="text-2xl font-semibold text-slate-900">
            {formatRupiah(totalRefund)}
          </p>
        </Panel>
      </div>

      <Panel title="Daftar Retur" description="Maksimal 200 retur terbaru ditampilkan.">
        <form method="get" className="mb-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr_2fr_auto]">
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
            <Label htmlFor="claim_status" className="text-sm font-medium">
              Status Klaim
            </Label>
            <SelectField
              name="claim_status"
              defaultValue={claimStatus ?? ""}
              id="claim_status"
              className="mt-1 h-10 w-full bg-white"
              placeholder="Semua"
            >
              <option value="">Semua</option>
              {Object.values(ReturnClaimStatus).map((status) => (
                <option key={status} value={status}>
                  {humanizeStatusLabel(status)}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Label htmlFor="fund_status" className="text-sm font-medium">
              Status Dana
            </Label>
            <SelectField
              name="fund_status"
              defaultValue={fundStatus ?? ""}
              id="fund_status"
              className="mt-1 h-10 w-full bg-white"
              placeholder="Semua"
            >
              <option value="">Semua</option>
              {Object.values(ReturnFundStatus).map((status) => (
                <option key={status} value={status}>
                  {humanizeStatusLabel(status)}
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
            title="Belum ada retur"
            description="Belum ada retur yang cocok dengan filter."
          />
        ) : (
          <Table className="min-w-full divide-y divide-slate-200">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-teal-50/40">
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nomor</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Transaksi Asal</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Dana</TableHead>
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
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{row.original_sale_number ?? "Tanpa referensi"}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{row.total_items}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <StatusBadge status={row.claim_status} />
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <StatusBadge status={row.fund_status} />
                    <p className="mt-1 text-xs text-slate-500">
                      {formatRupiah(row.refund_amount)}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <Link
                      href={`/customer-returns/${row.id}`}
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
