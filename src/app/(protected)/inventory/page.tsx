import {
  DateRangeFields,
  EmptyState,
  PageHeading,
  Panel,
  StatusBadge,
  inputClass,
  primaryButtonClass,
} from "@/components/ui";
import { formatNumber, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { StockAdjustmentModal } from "./inventory-manager";
import { InventoryTabs, type InventoryTab } from "./inventory-tabs";
import {
  calculateInventoryValuation,
  classifyPackagingMovement,
  classifyStockMovement,
  detectLowStock,
  type MovementGroup,
} from "./inventory-rules";
import type {
  InventoryAdjustmentOption,
  InventoryBatchView,
  InventoryMutationView,
  InventoryPackagingView,
  InventoryProductView,
} from "./types";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateBoundary(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tabParam = firstValue(params.tab);
  const tab: InventoryTab =
    tabParam === "packaging" || tabParam === "mutations" ? tabParam : "products";

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const rawDateFrom = (firstValue(params.date_from) ?? "").trim();
  const rawDateTo = (firstValue(params.date_to) ?? "").trim();
  const fromDate = parseDateBoundary(rawDateFrom, false) ?? defaultFrom;
  const toDate = parseDateBoundary(rawDateTo, true) ?? today;

  const rawGroup = firstValue(params.group) ?? "";
  const group: MovementGroup | "ALL" =
    rawGroup === "IN" || rawGroup === "OUT" || rawGroup === "ADJUSTMENT"
      ? rawGroup
      : "ALL";
  const itemType = firstValue(params.item_type) === "packaging" ? "packaging" : "product";
  const itemId = (firstValue(params.item_id) ?? "").trim();

  const [variantsRaw, packagingRaw, stockMovementsRaw, packagingMovementsRaw] =
    await Promise.all([
      prisma.productVariants.findMany({
        orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          stock_qty: true,
          damaged_stock_qty: true,
          min_stock: true,
          product: { select: { name: true } },
          unit: { select: { name: true } },
          stock_batches: {
            where: { remaining_qty: { gt: 0 } },
            orderBy: [{ received_at: "asc" }, { id: "asc" }],
            select: {
              id: true,
              received_at: true,
              source_type: true,
              remaining_qty: true,
              unit_cost: true,
            },
          },
        },
      }),
      prisma.packagingMaterials.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          stock_qty: true,
          min_stock: true,
          average_unit_cost: true,
          usage_unit: { select: { name: true } },
        },
      }),
      itemType === "product"
        ? prisma.stockMovements.findMany({
            where: {
              created_at: { gte: fromDate, lte: toDate },
              ...(itemId ? { variant_id: itemId } : {}),
            },
            orderBy: { created_at: "desc" },
            select: {
              id: true,
              created_at: true,
              movement_type: true,
              qty_change: true,
              balance_after: true,
              reference_number: true,
              notes: true,
              variant: {
                select: { name: true, product: { select: { name: true } } },
              },
            },
          })
        : Promise.resolve([]),
      itemType === "packaging"
        ? prisma.packagingMovements.findMany({
            where: {
              created_at: { gte: fromDate, lte: toDate },
              ...(itemId ? { packaging_material_id: itemId } : {}),
            },
            orderBy: { created_at: "desc" },
            select: {
              id: true,
              created_at: true,
              movement_type: true,
              qty_change: true,
              reference_number: true,
              packaging_material: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

  const variantLowStockIds = new Set(
    detectLowStock(
      variantsRaw.map((variant) => ({
        id: variant.id,
        name: `${variant.product.name} — ${variant.name}`,
        stock_qty: variant.stock_qty,
        min_stock: variant.min_stock,
      })),
    ).map((alert) => alert.id),
  );
  const packagingLowStockIds = new Set(
    detectLowStock(
      packagingRaw.map((material) => ({
        id: material.id,
        name: material.name,
        stock_qty: material.stock_qty,
        min_stock: material.min_stock,
      })),
    ).map((alert) => alert.id),
  );

  const valuation = calculateInventoryValuation({
    product_batches: variantsRaw.flatMap((variant) =>
      variant.stock_batches.map((batch) => ({
        remaining_qty: batch.remaining_qty,
        unit_cost: batch.unit_cost,
      })),
    ),
    packaging_materials: packagingRaw.map((material) => ({
      current_stock: material.stock_qty,
      average_unit_cost: material.average_unit_cost,
    })),
  });

  const productViews: InventoryProductView[] = variantsRaw.map((variant) => ({
    id: variant.id,
    variant_name: variant.name,
    product_name: variant.product.name,
    unit_name: variant.unit.name,
    stock_qty: variant.stock_qty.toNumber(),
    damaged_stock_qty: variant.damaged_stock_qty.toNumber(),
    min_stock: variant.min_stock?.toNumber() ?? null,
    is_low: variantLowStockIds.has(variant.id),
    batches: variant.stock_batches.map(
      (batch): InventoryBatchView => ({
        id: batch.id,
        received_at: toInputDate(batch.received_at),
        source_type: batch.source_type,
        remaining_qty: batch.remaining_qty.toNumber(),
        unit_cost: Number(batch.unit_cost),
        asset_value: batch.remaining_qty.mul(batch.unit_cost.toString()).toNumber(),
      }),
    ),
  }));

  const packagingViews: InventoryPackagingView[] = packagingRaw.map(
    (material) => ({
      id: material.id,
      name: material.name,
      unit_name: material.usage_unit.name,
      stock_qty: material.stock_qty.toNumber(),
      min_stock: material.min_stock?.toNumber() ?? null,
      average_unit_cost: material.average_unit_cost.toNumber(),
      asset_value: material.stock_qty
        .mul(material.average_unit_cost)
        .toDecimalPlaces(0)
        .toNumber(),
      is_low: packagingLowStockIds.has(material.id),
    }),
  );

  const mutationViews: InventoryMutationView[] = [
    ...stockMovementsRaw
      .map(
        (movement): InventoryMutationView => ({
          id: movement.id,
          date: toInputDate(movement.created_at),
          item_type: "Produk",
          item_name: `${movement.variant.product.name} — ${movement.variant.name}`,
          movement_type: movement.movement_type,
          group: classifyStockMovement(movement.movement_type),
          qty_change: movement.qty_change.toNumber(),
          balance_after: movement.balance_after.toNumber(),
          reference_number: movement.reference_number,
          notes: movement.notes,
        }),
      )
      .filter((view) => group === "ALL" || view.group === group),
    ...packagingMovementsRaw
      .map(
        (movement): InventoryMutationView => ({
          id: movement.id,
          date: toInputDate(movement.created_at),
          item_type: "Kemasan",
          item_name: movement.packaging_material.name,
          movement_type: movement.movement_type,
          group: classifyPackagingMovement(movement.movement_type),
          qty_change: movement.qty_change.toNumber(),
          balance_after: null,
          reference_number: movement.reference_number,
          notes: null,
        }),
      )
      .filter((view) => group === "ALL" || view.group === group),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  const adjustmentOptions: InventoryAdjustmentOption[] = productViews.map(
    (variant) => ({
      id: variant.id,
      label: `${variant.product_name} — ${variant.variant_name}`,
      stock_qty: variant.stock_qty,
    }),
  );

  const summaryCards = [
    { label: "Nilai Aset Produk", value: valuation.productAssetValue },
    { label: "Nilai Aset Kemasan", value: valuation.packagingAssetValue },
    { label: "Total Nilai Persediaan", value: valuation.totalAssetValue },
    {
      label: "Varian Stok Menipis",
      value: BigInt(variantLowStockIds.size + packagingLowStockIds.size),
    },
  ];

  const thClass =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
  const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

  return (
    <>
      <PageHeading
        title="Stok & Penyesuaian"
        description="Pantau batch FIFO produk, stok kemasan, riwayat mutasi, dan lakukan penyesuaian stok."
        actions={<StockAdjustmentModal variants={adjustmentOptions} />}
      />
      <InventoryTabs active={tab} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-zinc-600">{card.label}</p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">
              {card.label === "Varian Stok Menipis"
                ? card.value.toString()
                : formatRupiah(Number(card.value))}
            </p>
          </div>
        ))}
      </div>

      {tab === "products" ? (
        <div className="mt-6">
          <Panel
            title="Stok Produk & Batch FIFO"
            description="Batch aktif diurutkan dari yang paling lama diterima."
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead>
                  <tr>
                    <th className={thClass}>Varian</th>
                    <th className={thClass}>Stok</th>
                    <th className={thClass}>Stok Rusak</th>
                    <th className={thClass}>Batch Aktif (FIFO)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {productViews.map((variant) => (
                    <tr key={variant.id}>
                      <td className={`${tdClass} font-medium`}>
                        {variant.product_name} — {variant.variant_name}
                        {variant.is_low ? (
                          <div className="mt-1">
                            <StatusBadge status="Menipis" tone="warning">
                              Stok menipis (min. {formatNumber(variant.min_stock ?? 0)})
                            </StatusBadge>
                          </div>
                        ) : null}
                      </td>
                      <td className={tdClass}>
                        {formatNumber(variant.stock_qty)} {variant.unit_name}
                      </td>
                      <td className={tdClass}>
                        {formatNumber(variant.damaged_stock_qty)}
                      </td>
                      <td className={tdClass}>
                        {variant.batches.length === 0 ? (
                          <span className="text-zinc-400">Tidak ada batch aktif</span>
                        ) : (
                          <ul className="space-y-1">
                            {variant.batches.map((batch) => (
                              <li key={batch.id} className="text-xs text-zinc-600">
                                {batch.received_at} · {batch.source_type} ·{" "}
                                {formatNumber(batch.remaining_qty)} ×{" "}
                                {formatRupiah(batch.unit_cost)} ={" "}
                                {formatRupiah(batch.asset_value)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                  {productViews.length === 0 ? (
                    <tr>
                      <td className={tdClass} colSpan={4}>
                        <EmptyState
                          compact
                          title="Belum ada varian produk"
                        />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "packaging" ? (
        <div className="mt-6">
          <Panel
            title="Stok Kemasan"
            description="Nilai aset memakai rata-rata HPP kemasan."
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead>
                  <tr>
                    <th className={thClass}>Kemasan</th>
                    <th className={thClass}>Stok</th>
                    <th className={thClass}>Rata-rata HPP</th>
                    <th className={thClass}>Nilai Aset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {packagingViews.map((material) => (
                    <tr key={material.id}>
                      <td className={`${tdClass} font-medium`}>
                        {material.name}
                        {material.is_low ? (
                          <div className="mt-1">
                            <StatusBadge status="Menipis" tone="warning">
                              Stok menipis (min. {formatNumber(material.min_stock ?? 0)})
                            </StatusBadge>
                          </div>
                        ) : null}
                      </td>
                      <td className={tdClass}>
                        {formatNumber(material.stock_qty)} {material.unit_name}
                      </td>
                      <td className={tdClass}>
                        {formatRupiah(Math.round(material.average_unit_cost))}
                      </td>
                      <td className={tdClass}>
                        {formatRupiah(material.asset_value)}
                      </td>
                    </tr>
                  ))}
                  {packagingViews.length === 0 ? (
                    <tr>
                      <td className={tdClass} colSpan={4}>
                        <EmptyState compact title="Belum ada kemasan" />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "mutations" ? (
        <div className="mt-6">
          <Panel
            title="Kartu Stok / Riwayat Mutasi"
            description="Filter mutasi produk atau kemasan berdasarkan arah pergerakan dan tanggal."
          >
            <form method="get" className="grid gap-3 md:grid-cols-5">
              <input type="hidden" name="tab" value="mutations" />
              <select name="item_type" defaultValue={itemType} className={inputClass}>
                <option value="product">Produk</option>
                <option value="packaging">Kemasan</option>
              </select>
              <select name="item_id" defaultValue={itemId} className={inputClass}>
                <option value="">Semua item</option>
                {itemType === "product"
                  ? productViews.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.product_name} — {variant.variant_name}
                      </option>
                    ))
                  : packagingViews.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
              </select>
              <select name="group" defaultValue={group} className={inputClass}>
                <option value="ALL">Semua tipe</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
              </select>
              <DateRangeFields
                from={toInputDate(fromDate)}
                to={toInputDate(toDate)}
              />
              <div className="flex items-end md:col-span-5">
                <button type="submit" className={primaryButtonClass}>
                  Filter
                </button>
              </div>
            </form>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead>
                  <tr>
                    <th className={thClass}>Tanggal</th>
                    <th className={thClass}>Item</th>
                    <th className={thClass}>Tipe</th>
                    <th className={thClass}>Kelompok</th>
                    <th className={thClass}>Perubahan</th>
                    <th className={thClass}>Saldo</th>
                    <th className={thClass}>Referensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {mutationViews.map((mutation) => (
                    <tr key={`${mutation.item_type}-${mutation.id}`}>
                      <td className={tdClass}>{mutation.date}</td>
                      <td className={tdClass}>{mutation.item_name}</td>
                      <td className={tdClass}>{mutation.movement_type}</td>
                      <td className={tdClass}>{mutation.group}</td>
                      <td className={tdClass}>
                        {formatNumber(mutation.qty_change, 4)}
                      </td>
                      <td className={tdClass}>
                        {mutation.balance_after === null
                          ? "-"
                          : formatNumber(mutation.balance_after, 4)}
                      </td>
                      <td className={tdClass}>
                        <p>{mutation.reference_number}</p>
                        {mutation.notes ? (
                          <p className="text-xs text-zinc-500">{mutation.notes}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {mutationViews.length === 0 ? (
                    <tr>
                      <td className={tdClass} colSpan={7}>
                        <EmptyState
                          compact
                          title="Tidak ada mutasi"
                          description="Tidak ada mutasi pada filter ini."
                        />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
