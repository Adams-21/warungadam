import { PageHeading, Panel } from "@/components/ui";
import { formatNumber, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { PurchaseTabs } from "../purchase-tabs";
import type {
  PackagingMaterialOptionView,
  PackagingPurchaseView,
} from "../types";
import { PackagingPurchaseForm } from "./packaging-purchase-form";

export const instant = false;

export default async function PackagingPurchasesPage() {
  const [materials, purchases] = await Promise.all([
    prisma.packagingMaterials.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        conversion_factor: true,
        stock_qty: true,
        average_unit_cost: true,
        purchase_unit: { select: { name: true } },
        usage_unit: { select: { name: true } },
      },
    }),
    prisma.packagingPurchases.findMany({
      orderBy: { purchase_date: "desc" },
      include: {
        items: {
          include: {
            packaging_material: {
              select: {
                name: true,
                purchase_unit: { select: { name: true } },
                usage_unit: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const materialViews: PackagingMaterialOptionView[] = materials.map(
    (material) => ({
      id: material.id,
      name: material.name,
      purchase_unit_name: material.purchase_unit.name,
      usage_unit_name: material.usage_unit.name,
      conversion_factor: material.conversion_factor.toNumber(),
      stock_qty: material.stock_qty.toNumber(),
      average_unit_cost: material.average_unit_cost.toNumber(),
    }),
  );

  const purchaseViews: PackagingPurchaseView[] = purchases.map((purchase) => ({
    id: purchase.id,
    purchase_number: purchase.purchase_number,
    purchase_date: purchase.purchase_date.toISOString(),
    total_amount: Number(purchase.total_amount),
    notes: purchase.notes ?? "",
    items: purchase.items.map((item) => ({
      material_name: item.packaging_material.name,
      purchase_qty: item.purchase_qty.toNumber(),
      purchase_unit_name: item.packaging_material.purchase_unit.name,
      converted_usage_qty: item.converted_usage_qty.toNumber(),
      usage_unit_name: item.packaging_material.usage_unit.name,
      subtotal: Number(item.subtotal),
    })),
  }));

  const thClass =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
  const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

  return (
    <>
      <PageHeading
        title="Pembelian Kemasan"
        description="Catat pembelian material kemasan, konversi ke satuan pakai, dan perbarui biaya rata-rata."
      />
      <PurchaseTabs active="packaging" />

      <Panel
        title="Pembelian Kemasan Baru"
        description="Jumlah beli dikonversi ke satuan pakai sesuai faktor konversi material."
      >
        <PackagingPurchaseForm
          materials={materialViews}
          today={new Date().toISOString().slice(0, 10)}
        />
      </Panel>

      <div className="mt-6">
        <Panel title="Riwayat Pembelian Kemasan">
          {purchaseViews.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada pembelian kemasan.</p>
          ) : (
            <div className="space-y-4">
              {purchaseViews.map((purchase) => (
                <div
                  key={purchase.id}
                  className="rounded-lg border border-zinc-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {purchase.purchase_number}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(purchase.purchase_date).toLocaleDateString(
                          "id-ID",
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-zinc-900">
                      {formatRupiah(purchase.total_amount)}
                    </p>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-zinc-700">
                    {purchase.items.map((item, index) => (
                      <li key={`${purchase.id}-${index}`}>
                        {item.material_name}: {formatNumber(item.purchase_qty, 4)}{" "}
                        {item.purchase_unit_name} →{" "}
                        {formatNumber(item.converted_usage_qty, 4)}{" "}
                        {item.usage_unit_name} ·{" "}
                        {formatRupiah(item.subtotal)}
                      </li>
                    ))}
                  </ul>
                  {purchase.notes ? (
                    <p className="mt-2 text-xs text-zinc-500">{purchase.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className={thClass}>Material</th>
              <th className={thClass}>Stok Satuan Pakai</th>
              <th className={thClass}>Biaya Rata-rata</th>
              <th className={thClass}>Konversi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {materialViews.map((material) => (
              <tr key={material.id}>
                <td className={`${tdClass} font-medium`}>{material.name}</td>
                <td className={tdClass}>
                  {formatNumber(material.stock_qty, 4)} {material.usage_unit_name}
                </td>
                <td className={tdClass}>
                  {formatRupiah(Math.round(material.average_unit_cost))}
                </td>
                <td className={tdClass}>
                  1 {material.purchase_unit_name} ={" "}
                  {formatNumber(material.conversion_factor, 4)}{" "}
                  {material.usage_unit_name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
