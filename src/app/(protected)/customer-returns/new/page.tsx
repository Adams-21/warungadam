import Link from "next/link";
import {
  EmptyState,
  PageHeading,
  Panel,
  secondaryButtonClass,
} from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { NewCustomerReturnForm } from "./new-customer-return-form";
import type { CustomerReturnSaleView, CustomerReturnVariantView } from "../types";

export const instant = false;

export default async function NewCustomerReturnPage() {
  const sales = await prisma.sales.findMany({
    where: { order_status: "Selesai" },
    orderBy: { transaction_date: "desc" },
    take: 200,
    select: {
      id: true,
      transaction_number: true,
      transaction_date: true,
      total_amount: true,
      discount_amount: true,
      items: {
        select: {
          id: true,
          qty: true,
          unit_selling_price: true,
          subtotal_amount: true,
          variant: {
            select: {
              id: true,
              name: true,
              product: { select: { name: true } },
              unit: { select: { name: true } },
            },
          },
          batch_allocations: {
            select: {
              allocated_qty: true,
              reversed_qty: true,
              batch_unit_cost: true,
            },
          },
        },
      },
    },
  });

  const variants = await prisma.productVariants.findMany({
    where: { is_active: true },
    orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      product: { select: { name: true } },
      unit: { select: { name: true } },
    },
  });

  const purchasePrices = await prisma.purchaseItems.findMany({
    where: { variant_id: { in: variants.map((variant) => variant.id) } },
    select: { variant_id: true, unit_price: true },
    orderBy: { purchase: { created_at: "desc" } },
  });
  const latestCostByVariant = new Map<string, number>();
  for (const row of purchasePrices) {
    if (!latestCostByVariant.has(row.variant_id)) {
      latestCostByVariant.set(row.variant_id, Number(row.unit_price));
    }
  }

  const saleViews: CustomerReturnSaleView[] = sales
    .filter((sale) =>
      sale.items.some(
        (item) =>
          item.batch_allocations.reduce(
            (sum, allocation) =>
              sum + Number(allocation.allocated_qty) - Number(allocation.reversed_qty),
            0,
          ) > 0,
      ),
    )
    .map((sale) => ({
      id: sale.id,
      transaction_number: sale.transaction_number,
      transaction_date: sale.transaction_date.toISOString(),
      total_amount: Number(sale.total_amount),
      discount_amount: Number(sale.discount_amount),
      items: sale.items
        .map((item) => ({
          id: item.id,
          variant_id: item.variant.id,
          variant_label: `${item.variant.product.name} - ${item.variant.name}`,
          sold_qty: Number(item.qty),
          available_qty: item.batch_allocations.reduce(
            (sum, allocation) =>
              sum + Number(allocation.allocated_qty) - Number(allocation.reversed_qty),
            0,
          ),
          unit_selling_price: Number(item.unit_selling_price),
          subtotal_amount: Number(item.subtotal_amount),
          unit_cost: Number(
            item.batch_allocations[0]?.batch_unit_cost ??
              latestCostByVariant.get(item.variant.id) ??
              0,
          ),
        }))
        .filter((item) => item.available_qty > 0),
    }));

  const variantViews: CustomerReturnVariantView[] = variants.map((variant) => ({
    id: variant.id,
    label: `${variant.product.name} - ${variant.name} (${variant.unit.name})`,
    latest_unit_cost: latestCostByVariant.get(variant.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeading
        title="Retur Pelanggan Baru"
        description="Barang layak jual kembali ke batch asal secara LIFO, sedangkan barang rusak masuk stok rusak."
        actions={
          <Link href="/customer-returns" className={secondaryButtonClass}>
            Kembali ke Daftar Retur
          </Link>
        }
      />
      <Panel title="Formulir Retur">
        {saleViews.length === 0 && variantViews.length === 0 ? (
          <EmptyState
            compact
            title="Belum ada data yang dapat diretur"
            description="Belum ada transaksi atau varian barang yang dapat diretur."
          />
        ) : (
          <NewCustomerReturnForm sales={saleViews} variants={variantViews} />
        )}
      </Panel>
    </div>
  );
}
