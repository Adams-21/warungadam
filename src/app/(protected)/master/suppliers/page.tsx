import { PageHeading } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { SuppliersManager } from "./suppliers-manager";
import type { SupplierView } from "./types";

export const instant = false;

export default async function SuppliersPage() {
  const suppliers = await prisma.suppliers.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { purchases: true, variant_suppliers: true },
      },
    },
  });

  const supplierViews: SupplierView[] = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone,
    address: supplier.address ?? "",
    notes: supplier.notes ?? "",
    is_active: supplier.is_active,
    variant_count: supplier._count.variant_suppliers,
    purchase_count: supplier._count.purchases,
  }));

  return (
    <>
      <PageHeading
        title="Supplier"
        description="Kelola data supplier beserta kontak dan catatan kerja sama."
      />
      <SuppliersManager suppliers={supplierViews} />
    </>
  );
}
