import { ReturnClaimStatus, ReturnFundStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EmptyState,
  PageHeading,
  Panel,
  StatusBadge,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { formatNumber, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { uuidSchema } from "@/lib/schemas";
import { CustomerReturnStatusForms } from "../customer-return-status-forms";
import type {
  CustomerReturnDetailItemView,
  CustomerReturnDetailView,
  CustomerReturnStatusHistoryView,
} from "../types";

export const instant = false;

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

export default async function CustomerReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const row = await prisma.customerReturns.findUnique({
    where: { id },
    select: {
      id: true,
      return_number: true,
      return_date: true,
      reason: true,
      claim_status: true,
      fund_status: true,
      refund_amount: true,
      refund_paid_date: true,
      original_sale: { select: { transaction_number: true } },
      items: {
        select: {
          id: true,
          qty: true,
          condition: true,
          restored_hpp_amount: true,
          variant: {
            select: {
              name: true,
              product: { select: { name: true } },
              unit: { select: { name: true } },
            },
          },
          sale_item: {
            select: {
              variant: {
                select: {
                  name: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      status_histories: {
        orderBy: { created_at: "asc" },
        select: {
          id: true,
          status_group: true,
          old_status: true,
          new_status: true,
          notes: true,
          created_at: true,
          created_by: { select: { username: true } },
        },
      },
    },
  });

  if (!row) notFound();

  const items: CustomerReturnDetailItemView[] = row.items.map((item) => ({
    id: item.id,
    variant_label: `${item.variant.product.name} - ${item.variant.name} (${item.variant.unit.name})`,
    sale_item_id: item.sale_item?.variant
      ? `${item.sale_item.variant.product.name} - ${item.sale_item.variant.name}`
      : null,
    sale_item_label:
      item.sale_item && item.sale_item.variant
        ? `${item.sale_item.variant.product.name} - ${item.sale_item.variant.name}`
        : null,
    qty: Number(item.qty),
    condition: item.condition,
    restored_hpp_amount: Number(item.restored_hpp_amount),
  }));

  const histories: CustomerReturnStatusHistoryView[] = row.status_histories.map(
    (history) => ({
      id: history.id,
      status_group: history.status_group,
      old_status: history.old_status ?? "-",
      new_status: history.new_status,
      notes: history.notes,
      created_at: history.created_at.toISOString(),
      created_by_name: history.created_by.username,
    }),
  );

  const detail: CustomerReturnDetailView = {
    id: row.id,
    return_number: row.return_number,
    original_sale_number: row.original_sale?.transaction_number ?? null,
    return_date: row.return_date.toISOString(),
    reason: row.reason,
    claim_status: row.claim_status,
    fund_status: row.fund_status,
    refund_amount: Number(row.refund_amount),
    total_items: items.length,
    items,
    status_histories: histories,
  };

  return (
    <>
      <PageHeading
        title={`Retur ${detail.return_number}`}
        description={`Dibatalkan dari ${detail.original_sale_number ?? "transaksi tanpa referensi"} pada ${new Date(detail.return_date).toLocaleString("id-ID")}.`}
        actions={
          <>
            <Link href="/customer-returns" className={secondaryButtonClass}>
              Kembali ke Daftar Retur
            </Link>
            <Link href="/customer-returns/new" className={primaryButtonClass}>
              Catat Retur Baru
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Panel title="Status Klaim">
          <StatusBadge status={detail.claim_status} />
        </Panel>
        <Panel title="Status Dana">
          <StatusBadge status={detail.fund_status} />
          {row.refund_paid_date ? (
            <p className="text-xs text-zinc-500">
              Dibayar {new Date(row.refund_paid_date).toLocaleDateString("id-ID")}
            </p>
          ) : null}
        </Panel>
        <Panel title="Total Dana Retur">
          <p className="text-lg font-semibold text-zinc-900">
            {formatRupiah(detail.refund_amount)}
          </p>
        </Panel>
        <Panel title="Alasan">
          <p className="text-sm text-zinc-800">{detail.reason}</p>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Barang Retur">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={thClass}>Varian</th>
                  <th className={thClass}>Item Transaksi</th>
                  <th className={thClass}>Jumlah</th>
                  <th className={thClass}>Kondisi</th>
                  <th className={thClass}>HPP Dipulihkan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className={tdClass}>{item.variant_label}</td>
                    <td className={tdClass}>{item.sale_item_label ?? "Tanpa referensi"}</td>
                    <td className={tdClass}>{formatNumber(item.qty)}</td>
                    <td className={tdClass}>{item.condition}</td>
                    <td className={tdClass}>{formatRupiah(item.restored_hpp_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Perbarui Status">
          <CustomerReturnStatusForms
            id={detail.id}
            claimStatus={detail.claim_status}
            fundStatus={detail.fund_status}
            claimStatuses={Object.values(ReturnClaimStatus)}
            fundStatuses={Object.values(ReturnFundStatus)}
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Riwayat Status">
          {histories.length === 0 ? (
            <EmptyState compact title="Belum ada riwayat status" />
          ) : (
            <ul className="space-y-3">
              {histories.map((history) => (
                <li key={history.id} className="rounded-md border border-zinc-200 p-3">
                  <p className="text-sm font-medium text-zinc-900">
                    {history.status_group}: {history.old_status} → {history.new_status}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(history.created_at).toLocaleString("id-ID")} · {history.created_by_name}
                  </p>
                  {history.notes ? (
                    <p className="mt-1 text-sm text-zinc-700">{history.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
