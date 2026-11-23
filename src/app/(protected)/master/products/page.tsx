import { PageHeading } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { ProductsManager } from "./products-manager";
import type {
  CategoryView,
  ChannelView,
  ProductView,
  SupplierView,
  UnitView,
} from "./types";

export const instant = false;

export default async function ProductsPage() {
  const [categories, products, units, channels, suppliers] = await Promise.all([
    prisma.productCategories.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.products.findMany({
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true } },
        variants: {
          orderBy: { name: "asc" },
          include: {
            unit: { select: { id: true, name: true } },
            channel_prices: {
              orderBy: { sales_channel: { name: "asc" } },
              include: {
                sales_channel: { select: { id: true, name: true } },
              },
            },
            variant_suppliers: {
              orderBy: { supplier: { name: "asc" } },
              include: {
                supplier: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.units.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.salesChannels.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.suppliers.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const categoryViews: CategoryView[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    is_active: category.is_active,
    product_count: category._count.products,
  }));
  const unitViews: UnitView[] = units;
  const channelViews: ChannelView[] = channels;
  const supplierViews: SupplierView[] = suppliers;

  const productViews: ProductView[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    category_id: product.category_id,
    category_name: product.category.name,
    is_active: product.is_active,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      product_id: variant.product_id,
      name: variant.name,
      barcode: variant.barcode ?? "",
      unit_id: variant.unit_id,
      unit_name: variant.unit.name,
      default_selling_price: Number(variant.default_selling_price),
      stock_qty: variant.stock_qty.toNumber(),
      damaged_stock_qty: variant.damaged_stock_qty.toNumber(),
      min_stock: variant.min_stock?.toNumber() ?? null,
      is_active: variant.is_active,
      channel_prices: variant.channel_prices.map((price) => ({
        id: price.id,
        sales_channel_id: price.sales_channel_id,
        channel_name: price.sales_channel.name,
        selling_price: Number(price.selling_price),
      })),
      supplier_prices: variant.variant_suppliers.map((price) => ({
        id: price.id,
        supplier_id: price.supplier_id,
        supplier_name: price.supplier.name,
        purchase_price: Number(price.purchase_price),
      })),
    })),
  }));

  return (
    <>
      <PageHeading
        title="Produk & Varian"
        description="Kelola kategori, produk, varian, harga kanal, dan harga beli supplier."
      />
      <ProductsManager
        categories={categoryViews}
        products={productViews}
        units={unitViews}
        channels={channelViews}
        suppliers={supplierViews}
      />
    </>
  );
}
