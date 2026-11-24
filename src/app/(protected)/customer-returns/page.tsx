import {
  ReturnClaimStatus,
  ReturnFundStatus,
} from "@prisma/client";
import Link from "next/link";
import {
  PageHeading,
  Panel,
  inputClass,
  primaryButtonClass,
} from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { CustomerReturnListItemView } from "./types";

export const instant = false;

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

type SearchParams = Promise<{
  q?: string;
  claim_status?: string;
  fund_status?: string;
}>;

export default async function CustomerReturnsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const claimStatus = Object.values(ReturnClaimStatus).includes(
    params.claim_status as ReturnClaimStatus,
  )
    ? (params.claim_status as ReturnClaimStatus)
    : undefined;
  const fundStatus = Object.values(ReturnFundStatus).includes(
    params.fund_status as ReturnFundStatus,
  )
    ? (params.fund_status as ReturnFundStatus)
    : undefined;

  const where: {
    return_number?: { contains: string; mode: "insensitive" };
    claim_status?: ReturnClaimStatus;
    fund_status?: ReturnFundStatus;
  } = {};
  if (query) where.return_number = { contains: query, mode: "insensitive" };
  if (claimStatus) where.claim_status = claimStatus;
  if (fundStatus) where.fund_status = fundStatus;

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
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/customer-returns/new" className={primaryButtonClass}>
          Catat Retur Baru
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Panel title="Jumlah Retur">
          <p className="text-2xl font-semibold text-zinc-900">{views.length}</p>
        </Panel>
        <Panel title="Total Dana Retur">
          <p className="text-2xl font-semibold text-zinc-900">
            {formatRupiah(totalRefund)}
          </p>
        </Panel>
      </div>

      <Panel title="Daftar Retur" description="Maksimal 200 retur terbaru ditampilkan.">
        <form method="get" className="mb-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
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
            <label htmlFor="claim_status" className="text-sm font-medium">
              Status Klaim
            </label>
            <select
              id="claim_status"
              name="claim_status"
              defaultValue={claimStatus ?? ""}
              className={inputClass}
            >
              <option value="">Semua</option>
              {Object.values(ReturnClaimStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fund_status" className="text-sm font-medium">
              Status Dana
            </label>
            <select
              id="fund_status"
              name="fund_status"
              defaultValue={fundStatus ?? ""}
              className={inputClass}
            >
              <option value="">Semua</option>
              {Object.values(ReturnFundStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
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
            Belum ada retur yang cocok dengan filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={thClass}>Nomor</th>
                  <th className={thClass}>Tanggal</th>
                  <th className={thClass}>Transaksi Asal</th>
                  <th className={thClass}>Item</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Dana</th>
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
                    <td className={tdClass}>{row.original_sale_number ?? "Tanpa referensi"}</td>
                    <td className={tdClass}>{row.total_items}</td>
                    <td className={tdClass}>{row.claim_status}</td>
                    <td className={tdClass}>
                      <p>{row.fund_status}</p>
                      <p className="text-xs text-zinc-500">
                        {formatRupiah(row.refund_amount)}
                      </p>
                    </td>
                    <td className={tdClass}>
                      <Link
                        href={`/customer-returns/${row.id}`}
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
