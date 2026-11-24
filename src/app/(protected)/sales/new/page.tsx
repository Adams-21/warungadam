import { PageHeading, Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { NewSaleForm } from "./new-sale-form";
import type {
  SaleChannelOptionView,
  SalePackagingMaterialView,
  SalePackageSizeView,
  SaleVariantOptionView,
} from "../types";

export const instant = false;

export default async function NewSalePage() {
  const [channels, variants, packageSizes, materials, settings] =
    await Promise.all([
      prisma.salesChannels.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, is_marketplace: true },
      }),
      prisma.productVariants.findMany({
        where: { is_active: true },
        orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          default_selling_price: true,
          stock_qty: true,
          product: { select: { name: true } },
          unit: { select: { name: true } },
          channel_prices: {
            select: { sales_channel_id: true, selling_price: true },
          },
          stock_batches: {
            where: { remaining_qty: { gt: 0 } },
            select: { remaining_qty: true, unit_cost: true },
          },
        },
      }),
      prisma.packageSizes.findMany({
        where: { is_active: true },
        orderBy: [{ sort_order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          items: {
            orderBy: { packaging_material: { name: "asc" } },
            select: {
              packaging_material_id: true,
              default_usage_qty: true,
              packaging_material: {
                select: {
                  name: true,
                  stock_qty: true,
                  average_unit_cost: true,
                  usage_unit: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.packagingMaterials.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          stock_qty: true,
          average_unit_cost: true,
          usage_unit: { select: { name: true } },
        },
      }),
      prisma.businessSettings.findFirst({
        orderBy: { updated_at: "desc" },
        select: { default_admin_fee_rate: true },
      }),
    ]);

  const channelViews: SaleChannelOptionView[] = channels;
  const variantViews: SaleVariantOptionView[] = variants.map((variant) => {
    const totalRemaining = variant.stock_batches.reduce(
      (sum, batch) => sum + batch.remaining_qty.toNumber(),
      0,
    );
    const weightedCost = totalRemaining
      ? Math.round(
          variant.stock_batches.reduce(
            (sum, batch) =>
              sum +
              Number(batch.unit_cost) * batch.remaining_qty.toNumber(),
            0,
          ) / totalRemaining,
        )
      : Number(variant.default_selling_price);

    return {
      id: variant.id,
      label: `${variant.product.name} — ${variant.name}`,
      unit_name: variant.unit.name,
      stock_qty: variant.stock_qty.toNumber(),
      default_selling_price: Number(variant.default_selling_price),
      cost_hint: weightedCost,
      channel_prices: Object.fromEntries(
        variant.channel_prices.map((price) => [
          price.sales_channel_id,
          Number(price.selling_price),
        ]),
      ),
    };
  });

  const sizeViews: SalePackageSizeView[] = packageSizes.map((size) => ({
    id: size.id,
    name: size.name,
    items: size.items.map((item) => ({
      packaging_material_id: item.packaging_material_id,
      material_name: item.packaging_material.name,
      usage_unit_name: item.packaging_material.usage_unit.name,
      default_usage_qty: item.default_usage_qty.toNumber(),
      stock_qty: item.packaging_material.stock_qty.toNumber(),
      average_unit_cost: item.packaging_material.average_unit_cost.toNumber(),
    })),
  }));

  const materialViews: SalePackagingMaterialView[] = materials.map(
    (material) => ({
      id: material.id,
      name: material.name,
      usage_unit_name: material.usage_unit.name,
      stock_qty: material.stock_qty.toNumber(),
      average_unit_cost: material.average_unit_cost.toNumber(),
    }),
  );

  return (
    <>
      <PageHeading
        title="Catat Penjualan"
        description="Simpan transaksi, alokasikan FIFO, potong stok produk dan kemasan, lalu hitung HPP otomatis."
      />
      <Panel
        title="Detail Transaksi"
        description="Stok dipotong sekali saat transaksi disimpan dengan status Selesai."
      >
        <NewSaleForm
          channels={channelViews}
          variants={variantViews}
          packageSizes={sizeViews}
          materials={materialViews}
          adminFeeRate={Number(settings?.default_admin_fee_rate ?? 22)}
          today={new Date().toISOString().slice(0, 10)}
        />
      </Panel>
    </>
  );
}
