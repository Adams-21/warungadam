import { PageHeading } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { PackagingManager } from "./packaging-manager";
import type {
  PackagingMaterialView,
  PackageSizeView,
  UnitOptionView,
} from "./types";

export const instant = false;

export default async function PackagingPage() {
  const [materials, sizes, units] = await Promise.all([
    prisma.packagingMaterials.findMany({
      orderBy: { name: "asc" },
      include: {
        purchase_unit: { select: { name: true } },
        usage_unit: { select: { name: true } },
      },
    }),
    prisma.packageSizes.findMany({
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { sales: true } },
        items: {
          orderBy: { packaging_material: { name: "asc" } },
          include: {
            packaging_material: {
              select: { name: true, average_unit_cost: true },
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
  ]);

  const unitViews: UnitOptionView[] = units;

  const materialViews: PackagingMaterialView[] = materials.map((material) => ({
    id: material.id,
    name: material.name,
    purchase_unit_name: material.purchase_unit.name,
    usage_unit_name: material.usage_unit.name,
    conversion_factor: material.conversion_factor.toNumber(),
    stock_qty: material.stock_qty.toNumber(),
    min_stock: material.min_stock?.toNumber() ?? null,
    average_unit_cost: material.average_unit_cost.toNumber(),
    is_active: material.is_active,
  }));

  const costByMaterialId = new Map(
    materialViews.map((material) => [material.id, material.average_unit_cost]),
  );

  const sizeViews: PackageSizeView[] = sizes.map((size) => {
    const items = size.items.map((item) => {
      const unitCost = costByMaterialId.get(item.packaging_material_id) ?? 0;
      return {
        id: item.id,
        packaging_material_id: item.packaging_material_id,
        material_name: item.packaging_material.name,
        default_usage_qty: item.default_usage_qty.toNumber(),
        unit_cost: unitCost,
        subtotal: item.default_usage_qty.toNumber() * unitCost,
      };
    });

    return {
      id: size.id,
      name: size.name,
      dimension_label: size.dimension_label ?? "",
      sort_order: size.sort_order,
      is_active: size.is_active,
      sales_count: size._count.sales,
      estimated_hpp: items.reduce((total, item) => total + item.subtotal, 0),
      items,
    };
  });

  return (
    <>
      <PageHeading
        title="Kemasan & Ukuran Paket"
        description="Kelola material kemasan, konversi satuan, ukuran paket, dan komposisinya."
      />
      <PackagingManager
        materials={materialViews}
        sizes={sizeViews}
        units={unitViews}
      />
    </>
  );
}
