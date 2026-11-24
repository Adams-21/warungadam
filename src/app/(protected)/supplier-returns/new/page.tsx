import Link from "next/link";
import { PageHeading, Panel, secondaryButtonClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { SupplierReturnResolution } from "@prisma/client";
import { NewSupplierReturnForm } from "../new-supplier-return-form";
import type { SupplierReturnPurchaseView } from "../types";

export const instant = false;

export default async function NewSupplierReturnPage() {
  const purchases = await prisma.purchases.findMany({
    orderBy: { purchase_date: "desc" },
    take: 200,
    select: {
      id: true,
      purchase_number: true,
      purchase_date: true,
      remaining_amount: true,
      supplier: { select: { name: true } },
      goods_receipts: {
        select: {
          items: {
            select: {
              id: true,
              received_qty: true,
              variant: {
                select: {
                  id: true,
                  name: true,
                  product: { select: { name: true } },
                  unit: { select: { name: true } },
                },
              },
              purchase_item: { select: { unit_price: true } },
              stock_batch: { select: { id: true, remaining_qty: true } },
              supplier_return_items: { select: { qty: true } },
            },
          },
        },
      },
    },
  });

  const purchaseViews: SupplierReturnPurchaseView[] = purchases
    .map((purchase) => ({
      id: purchase.id,
      purchase_number: purchase.purchase_number,
      supplier_name: purchase.supplier.name,
      purchase_date: purchase.purchase_date.toISOString(),
      remaining_amount: Number(purchase.remaining_amount),
      items: purchase.goods_receipts
        .flatMap((receipt) => receipt.items)
        .filter((item) => item.stock_batch)
        .map((item) => ({
          id: item.id,
          batch_id: item.stock_batch!.id,
          variant_id: item.variant.id,
          label: `${item.variant.product.name} - ${item.variant.name} (${item.variant.unit.name})`,
          received_qty: Number(item.received_qty),
          prior_returned_qty: item.supplier_return_items.reduce(
            (sum, row) => sum + Number(row.qty),
            0,
          ),
          available_qty:
            Number(item.received_qty) -
            item.supplier_return_items.reduce((sum, row) => sum + Number(row.qty), 0),
          batch_remaining_qty: Number(item.stock_batch!.remaining_qty),
          unit_price: Number(item.purchase_item.unit_price),
        }))
        .filter((item) => item.available_qty > 0 && item.batch_remaining_qty > 0),
    }))
    .filter((purchase) => purchase.items.length > 0);

  return (
    <>
      <PageHeading
        title="Retur Supplier Baru"
        description="Kurangi batch penerimaan asal dan pilih penyelesaian: potong tagihan, pengembalian dana, atau barang pengganti."
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/supplier-returns" className={secondaryButtonClass}>
          Kembali ke Daftar Retur Supplier
        </Link>
      </div>
      <Panel title="Formulir Retur Supplier">
        {purchaseViews.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
            Belum ada penerimaan barang yang dapat diretur.
          </p>
        ) : (
          <NewSupplierReturnForm
            purchases={purchaseViews}
            resolutions={Object.values(SupplierReturnResolution)}
          />
        )}
      </Panel>
    </>
  );
}
