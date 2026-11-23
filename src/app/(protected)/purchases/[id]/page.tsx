import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading, Panel, primaryButtonClass } from "@/components/ui";
import { formatNumber, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { uuidSchema } from "@/lib/schemas";
import { PurchaseTabs } from "../purchase-tabs";
import {
  paymentStatusLabel,
  paymentTypeLabel,
  purchaseStatusLabel,
  type GoodsReceiptView,
  type PurchaseDetailView,
  type SupplierPaymentView,
} from "../types";
import { ReceiveGoodsForm } from "./receive-goods-form";
import { SupplierPaymentForm } from "./supplier-payment-form";

export const instant = false;

type PurchaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

function variantLabel(variant: { name: string; product: { name: string } }) {
  return `${variant.product.name} — ${variant.name}`;
}

export default async function PurchaseDetailPage({
  params,
}: PurchaseDetailPageProps) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const purchase = await prisma.purchases.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true } },
      items: {
        include: {
          variant: {
            select: {
              name: true,
              product: { select: { name: true } },
              unit: { select: { name: true } },
            },
          },
        },
      },
      goods_receipts: {
        orderBy: { received_at: "desc" },
        include: {
          items: {
            include: {
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
      },
      supplier_payments: { orderBy: { payment_date: "desc" } },
    },
  });

  if (!purchase) notFound();

  const itemViews = purchase.items.map((item) => ({
    id: item.id,
    variant_label: variantLabel(item.variant),
    unit_name: item.variant.unit.name,
    ordered_qty: item.ordered_qty.toNumber(),
    received_qty: item.received_qty.toNumber(),
    remaining_qty: item.ordered_qty.minus(item.received_qty).toNumber(),
    unit_price: Number(item.unit_price),
    subtotal: Number(item.unit_price) * item.ordered_qty.toNumber(),
  }));

  const goodsReceiptViews: GoodsReceiptView[] = purchase.goods_receipts.map(
    (receipt) => ({
      id: receipt.id,
      receipt_number: receipt.receipt_number,
      received_at: receipt.received_at.toISOString(),
      notes: receipt.notes ?? "",
      items: receipt.items.map((item) => ({
        variant_label: variantLabel(item.variant),
        qty: item.received_qty.toNumber(),
        unit_name: item.variant.unit.name,
      })),
    }),
  );

  const supplierPaymentViews: SupplierPaymentView[] =
    purchase.supplier_payments.map((payment) => ({
      id: payment.id,
      payment_date: payment.payment_date.toISOString(),
      amount: Number(payment.amount),
      payment_method: payment.payment_method,
      is_void: payment.is_void,
    }));

  const detail: PurchaseDetailView = {
    id: purchase.id,
    purchase_number: purchase.purchase_number,
    supplier_name: purchase.supplier.name,
    purchase_date: purchase.purchase_date.toISOString(),
    payment_type: purchase.payment_type,
    due_date: purchase.due_date?.toISOString() ?? null,
    total_amount: Number(purchase.total_amount),
    paid_amount: Number(purchase.paid_amount),
    remaining_amount: Number(purchase.remaining_amount),
    status: purchase.status,
    payment_status: purchase.payment_status,
    notes: purchase.notes ?? "",
    items: itemViews,
    goods_receipts: goodsReceiptViews,
    supplier_payments: supplierPaymentViews,
  };

  const canReceive =
    purchase.status !== "Diterima_seluruhnya" &&
    purchase.status !== "Dibatalkan" &&
    itemViews.some((item) => item.remaining_qty > 0);
  const canPay =
    purchase.status !== "Dibatalkan" &&
    purchase.remaining_amount > BigInt(0);
  const today = new Date().toISOString().slice(0, 10);

  const thClass =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
  const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

  return (
    <>
      <PageHeading
        title={`Pesanan ${purchase.purchase_number}`}
        description="Pantau penerimaan barang, batch FIFO, dan pembayaran supplier."
      />
      <PurchaseTabs active="orders" />

      <div className="mb-6">
        <Link href="/purchases" className={primaryButtonClass}>
          Kembali ke Daftar
        </Link>
      </div>

      <Panel title="Ringkasan Pesanan">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Supplier
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{detail.supplier_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Tanggal Pesanan
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {new Date(detail.purchase_date).toLocaleDateString("id-ID")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Tipe Pembayaran
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {paymentTypeLabel(detail.payment_type)}
              {detail.due_date
                ? ` · ${new Date(detail.due_date).toLocaleDateString("id-ID")}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Status
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {purchaseStatusLabel(detail.status)} ·{" "}
              {paymentStatusLabel(detail.payment_status)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Total Pesanan
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {formatRupiah(detail.total_amount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Sudah Dibayar
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {formatRupiah(detail.paid_amount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Sisa Tagihan
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {formatRupiah(detail.remaining_amount)}
            </dd>
          </div>
          {detail.notes ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Catatan
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{detail.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thClass}>Varian Produk</th>
              <th className={thClass}>Dipesan</th>
              <th className={thClass}>Diterima</th>
              <th className={thClass}>Sisa</th>
              <th className={thClass}>Harga Satuan</th>
              <th className={thClass}>Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {itemViews.map((item) => (
              <tr key={item.id}>
                <td className={`${tdClass} font-medium`}>{item.variant_label}</td>
                <td className={tdClass}>
                  {formatNumber(item.ordered_qty, 4)} {item.unit_name}
                </td>
                <td className={tdClass}>
                  {formatNumber(item.received_qty, 4)} {item.unit_name}
                </td>
                <td className={tdClass}>
                  {formatNumber(item.remaining_qty, 4)} {item.unit_name}
                </td>
                <td className={tdClass}>{formatRupiah(item.unit_price)}</td>
                <td className={tdClass}>
                  {formatRupiah(Math.round(item.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canReceive ? (
          <Panel
            title="Terima Barang"
            description="Penerimaan membuat batch FIFO baru dan mencatat mutasi stok masuk."
          >
            <ReceiveGoodsForm
              items={itemViews}
              purchaseId={purchase.id}
              today={today}
            />
          </Panel>
        ) : null}
        {canPay ? (
          <Panel
            title="Catat Pembayaran Supplier"
            description={`Sisa tagihan ${formatRupiah(detail.remaining_amount)}.`}
          >
            <SupplierPaymentForm
              purchaseId={purchase.id}
              remainingAmount={detail.remaining_amount}
              today={today}
            />
          </Panel>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Riwayat Penerimaan">
          {goodsReceiptViews.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada penerimaan.</p>
          ) : (
            <div className="space-y-4">
              {goodsReceiptViews.map((receipt) => (
                <div
                  key={receipt.id}
                  className="rounded-lg border border-zinc-200 p-3"
                >
                  <p className="text-sm font-medium text-zinc-900">
                    {receipt.receipt_number}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(receipt.received_at).toLocaleString("id-ID")}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                    {receipt.items.map((item, index) => (
                      <li key={`${receipt.id}-${index}`}>
                        {item.variant_label}: {formatNumber(item.qty, 4)}{" "}
                        {item.unit_name}
                      </li>
                    ))}
                  </ul>
                  {receipt.notes ? (
                    <p className="mt-2 text-xs text-zinc-500">{receipt.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Riwayat Pembayaran">
          {supplierPaymentViews.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada pembayaran.</p>
          ) : (
            <div className="space-y-3">
              {supplierPaymentViews.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {formatRupiah(payment.amount)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(payment.payment_date).toLocaleDateString("id-ID")} ·{" "}
                      {payment.payment_method}
                      {payment.is_void ? " · Dibatalkan" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
