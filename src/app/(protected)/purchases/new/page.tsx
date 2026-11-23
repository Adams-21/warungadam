import { PageHeading, Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { NewPurchaseForm } from "./new-purchase-form";
import { PurchaseTabs } from "../purchase-tabs";
import type { SupplierOptionView, VariantOptionView } from "../types";

export const instant = false;

export default async function NewPurchasePage() {
  const [suppliers, variants] = await Promise.all([
    prisma.suppliers.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.productVariants.findMany({
      where: { is_active: true },
      orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        product: { select: { name: true } },
        unit: { select: { name: true } },
      },
    }),
  ]);

  const supplierViews: SupplierOptionView[] = suppliers;
  const variantViews: VariantOptionView[] = variants.map((variant) => ({
    id: variant.id,
    label: `${variant.product.name} — ${variant.name}`,
    unit_name: variant.unit.name,
  }));

  return (
    <>
      <PageHeading
        title="Pesanan Pembelian Baru"
        description="Catat supplier, tipe pembayaran, dan daftar produk yang dipesan."
      />
      <PurchaseTabs active="orders" />
      <Panel title="Detail Pesanan" description="Total dihitung otomatis dari jumlah dan harga satuan.">
        <NewPurchaseForm
          suppliers={supplierViews}
          variants={variantViews}
          today={new Date().toISOString().slice(0, 10)}
        />
      </Panel>
    </>
  );
}
