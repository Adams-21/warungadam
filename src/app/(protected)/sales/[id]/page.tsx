import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EmptyState,
  PageHeading,
  Panel,
  StatusBadge,
  primaryButtonClass,
} from "@/components/ui";
import { formatNumber, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { uuidSchema } from "@/lib/schemas";
import { PrintSaleButton } from "../print-button";
import {
  saleOrderStatusLabel,
  salePaymentStatusLabel,
  saleSettlementStatusLabel,
  type SaleDetailView,
} from "../types";

export const instant = false;

type SaleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const [sale, settings] = await Promise.all([
    prisma.sales.findUnique({
      where: { id },
      include: {
        sales_channel: { select: { name: true } },
        package_size: { select: { name: true, dimension_label: true } },
        created_by: { select: { username: true } },
        items: {
          include: {
            variant: {
              select: {
                name: true,
                product: { select: { name: true } },
                unit: { select: { name: true } },
              },
            },
            batch_allocations: {
              include: {
                batch: {
                  select: { received_at: true, initial_qty: true },
                },
              },
            },
          },
        },
        packaging_usages: {
          include: {
            packaging_material: {
              select: {
                name: true,
                usage_unit: { select: { name: true } },
              },
            },
          },
        },
        status_histories: {
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            status_group: true,
            new_status: true,
            reason: true,
            created_at: true,
          },
        },
      },
    }),
    prisma.businessSettings.findFirst({
      orderBy: { updated_at: "desc" },
      select: { business_name: true, address: true, phone: true },
    }),
  ]);

  if (!sale) notFound();

  const productCogs = sale.items.reduce(
    (sum, item) => sum + item.total_hpp_fifo,
    BigInt(0),
  );
  const packagingCogs = sale.packaging_usages.reduce(
    (sum, usage) => sum + (usage.adjusted_hpp ?? usage.calculated_hpp),
    BigInt(0),
  );
  const totalCogs = productCogs + packagingCogs;

  const detail: SaleDetailView = {
    id: sale.id,
    transaction_number: sale.transaction_number,
    transaction_date: sale.transaction_date.toISOString(),
    channel_name: sale.sales_channel.name,
    external_order_number: sale.external_order_number ?? "",
    package_size_name: sale.package_size
      ? `${sale.package_size.name}${
          sale.package_size.dimension_label
            ? ` (${sale.package_size.dimension_label})`
            : ""
        }`
      : "Tanpa kemasan standar",
    created_by: sale.created_by.username,
    subtotal_amount: Number(sale.subtotal_amount),
    discount_amount: Number(sale.discount_amount),
    additional_fee_amount: Number(sale.additional_fee_amount),
    total_amount: Number(sale.total_amount),
    product_cogs: Number(productCogs),
    packaging_cogs: Number(packagingCogs),
    total_cogs: Number(totalCogs),
    gross_profit: Number(sale.total_amount - totalCogs),
    admin_fee_estimate_rate: sale.admin_fee_estimate_rate.toNumber(),
    admin_fee_estimate_amount: Number(sale.admin_fee_estimate_amount),
    order_status: sale.order_status,
    payment_status: sale.payment_status,
    settlement_status: sale.settlement_status,
    is_stock_deducted: sale.is_stock_deducted,
    items: sale.items.map((item) => ({
      id: item.id,
      variant_label: `${item.variant.product.name} — ${item.variant.name}`,
      unit_name: item.variant.unit.name,
      qty: item.qty.toNumber(),
      unit_selling_price: Number(item.unit_selling_price),
      discount_amount: Number(item.discount_amount),
      subtotal_amount: Number(item.subtotal_amount),
      total_hpp_fifo: Number(item.total_hpp_fifo),
      allocations: item.batch_allocations
        .map((allocation) => ({
          batch_id: allocation.batch_id,
          allocated_qty: allocation.allocated_qty.toNumber(),
          reversed_qty: allocation.reversed_qty.toNumber(),
          batch_unit_cost: Number(allocation.batch_unit_cost),
          received_at: allocation.batch.received_at.toISOString(),
          subtotal_hpp: Number(allocation.batch_unit_cost) *
            allocation.allocated_qty.toNumber(),
        }))
        .sort(
          (left, right) =>
            new Date(left.received_at).getTime() -
            new Date(right.received_at).getTime(),
        ),
    })),
    packaging_usages: sale.packaging_usages.map((usage) => ({
      id: usage.id,
      material_name: usage.packaging_material.name,
      usage_unit_name: usage.packaging_material.usage_unit.name,
      standard_usage_qty: usage.standard_usage_qty.toNumber(),
      actual_usage_qty: usage.actual_usage_qty.toNumber(),
      unit_cost_snapshot: usage.unit_cost_snapshot.toNumber(),
      calculated_hpp: Number(usage.calculated_hpp),
      adjusted_hpp: usage.adjusted_hpp === null ? null : Number(usage.adjusted_hpp),
      final_hpp: Number(usage.adjusted_hpp ?? usage.calculated_hpp),
    })),
    status_histories: sale.status_histories.map((history) => ({
      id: history.id,
      status_group: history.status_group,
      new_status: history.new_status,
      reason: history.reason ?? "",
      created_at: history.created_at.toISOString(),
    })),
  };

  const thClass =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
  const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

  return (
    <>
      <PageHeading
        title={`Transaksi ${detail.transaction_number}`}
        description="Rincian item, alokasi batch FIFO, pemakaian kemasan, dan perhitungan HPP."
        actions={
          <>
            <Link href="/sales" className={primaryButtonClass}>
              Kembali ke Daftar
            </Link>
            <PrintSaleButton />
          </>
        }
      />

      <Panel
        title={settings?.business_name ?? "BizManage"}
        description={settings?.address ?? undefined}
      >
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              No. Transaksi
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {detail.transaction_number}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Tanggal
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {new Date(detail.transaction_date).toLocaleString("id-ID")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Kanal
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{detail.channel_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Petugas
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{detail.created_by}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              No. Eksternal
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {detail.external_order_number || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Ukuran Paket
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {detail.package_size_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Status
            </dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              <StatusBadge status={detail.order_status}>
                {saleOrderStatusLabel(detail.order_status)}
              </StatusBadge>
              <StatusBadge status={detail.payment_status}>
                {salePaymentStatusLabel(detail.payment_status)}
              </StatusBadge>
              <StatusBadge status={detail.settlement_status}>
                {saleSettlementStatusLabel(detail.settlement_status)}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Stok Produk
            </dt>
            <dd className="mt-1">
              <StatusBadge
                status={detail.is_stock_deducted ? "Sudah dipotong" : "Belum dipotong"}
                tone={detail.is_stock_deducted ? "success" : "warning"}
              />
            </dd>
          </div>
        </dl>
      </Panel>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="Penjualan Bruto">
          <p className="text-xl font-semibold text-zinc-900">
            {formatRupiah(detail.total_amount)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Subtotal {formatRupiah(detail.subtotal_amount)} · Diskon{" "}
            {formatRupiah(detail.discount_amount)} · Tambahan{" "}
            {formatRupiah(detail.additional_fee_amount)}
          </p>
        </Panel>
        <Panel title="HPP Produk (FIFO)">
          <p className="text-xl font-semibold text-zinc-900">
            {formatRupiah(detail.product_cogs)}
          </p>
        </Panel>
        <Panel title="HPP Kemasan">
          <p className="text-xl font-semibold text-zinc-900">
            {formatRupiah(detail.packaging_cogs)}
          </p>
        </Panel>
        <Panel title="Laba Kotor">
          <p className="text-xl font-semibold text-zinc-900">
            {formatRupiah(detail.gross_profit)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Estimasi admin {formatRupiah(detail.admin_fee_estimate_amount)} (
            {formatNumber(detail.admin_fee_estimate_rate, 2)}%)
          </p>
        </Panel>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thClass}>Varian</th>
              <th className={thClass}>Jumlah</th>
              <th className={thClass}>Harga Jual</th>
              <th className={thClass}>Diskon</th>
              <th className={thClass}>Subtotal</th>
              <th className={thClass}>HPP FIFO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {detail.items.map((item) => (
              <tr key={item.id}>
                <td className={`${tdClass} font-medium`}>
                  {item.variant_label}
                  <div className="mt-2 space-y-1">
                    {item.allocations.map((allocation) => (
                      <p
                        key={allocation.batch_id}
                        className="text-xs text-zinc-500"
                      >
                        Batch {allocation.batch_id.slice(0, 8)} ·{" "}
                        {new Date(allocation.received_at).toLocaleDateString(
                          "id-ID",
                        )}{" "}
                        · {formatNumber(allocation.allocated_qty, 4)} ×{" "}
                        {formatRupiah(allocation.batch_unit_cost)} ={" "}
                        {formatRupiah(allocation.subtotal_hpp)}
                      </p>
                    ))}
                  </div>
                </td>
                <td className={tdClass}>
                  {formatNumber(item.qty, 4)} {item.unit_name}
                </td>
                <td className={tdClass}>
                  {formatRupiah(item.unit_selling_price)}
                </td>
                <td className={tdClass}>{formatRupiah(item.discount_amount)}</td>
                <td className={tdClass}>{formatRupiah(item.subtotal_amount)}</td>
                <td className={tdClass}>{formatRupiah(item.total_hpp_fifo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Rincian Kemasan">
          {detail.packaging_usages.length === 0 ? (
            <EmptyState
              compact
              title="Tidak memakai material kemasan"
              description="Transaksi ini tidak memakai material kemasan."
            />
          ) : (
            <table className="min-w-full divide-y divide-zinc-200">
              <thead>
                <tr>
                  <th className={thClass}>Material</th>
                  <th className={thClass}>Standar</th>
                  <th className={thClass}>Aktual</th>
                  <th className={thClass}>HPP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {detail.packaging_usages.map((usage) => (
                  <tr key={usage.id}>
                    <td className={`${tdClass} font-medium`}>
                      {usage.material_name}
                    </td>
                    <td className={tdClass}>
                      {formatNumber(usage.standard_usage_qty, 4)}{" "}
                      {usage.usage_unit_name}
                    </td>
                    <td className={tdClass}>
                      {formatNumber(usage.actual_usage_qty, 4)}{" "}
                      {usage.usage_unit_name}
                    </td>
                    <td className={tdClass}>
                      {formatRupiah(usage.final_hpp)}
                      <span className="block text-xs text-zinc-500">
                        Hitung {formatRupiah(usage.calculated_hpp)}
                        {usage.adjusted_hpp !== null
                          ? ` · Disesuaikan ${formatRupiah(usage.adjusted_hpp)}`
                          : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Riwayat Status">
          {detail.status_histories.length === 0 ? (
            <EmptyState compact title="Belum ada riwayat status" />
          ) : (
            <div className="space-y-3">
              {detail.status_histories.map((history) => (
                <div
                  key={history.id}
                  className="rounded-lg border border-zinc-200 p-3"
                >
                  <p className="text-sm font-medium text-zinc-900">
                    {history.status_group}: {history.new_status}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(history.created_at).toLocaleString("id-ID")}
                  </p>
                  {history.reason ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      {history.reason}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
