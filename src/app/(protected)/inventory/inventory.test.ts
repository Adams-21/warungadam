import { PackagingMovementType, StockMovementType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateInventoryValuation,
  classifyPackagingMovement,
  classifyStockMovement,
  detectLowStock,
  planStockAdjustment,
  validateStockAdjustment,
} from "./inventory-rules";

const BATCHES = [
  {
    id: "batch-a",
    received_at: "2026-01-01T00:00:00.000Z",
    remaining_qty: 2,
    unit_cost: BigInt(10000),
  },
  {
    id: "batch-b",
    received_at: "2026-02-01T00:00:00.000Z",
    remaining_qty: 3,
    unit_cost: BigInt(12000),
  },
];

describe("Validasi Penyesuaian Stok", () => {
  it("menerima penyesuaian positif dengan alasan dan HPP", () => {
    expect(
      validateStockAdjustment(
        { variant_id: "v1", qty_change: 2, unit_cost: BigInt(11000), reason: "Stok fisik lebih" },
        BATCHES,
      ),
    ).toBeNull();
  });

  it("menolak alasan kosong, selisih nol, HPP negatif, dan stok kurang", () => {
    const base = {
      variant_id: "v1",
      qty_change: 1,
      unit_cost: BigInt(10000),
      reason: "Penyesuaian",
    };

    expect(
      validateStockAdjustment({ ...base, reason: "   " }, BATCHES),
    ).toContain("wajib diisi");
    expect(validateStockAdjustment({ ...base, qty_change: 0 }, BATCHES)).toContain(
      "tidak boleh 0",
    );
    expect(
      validateStockAdjustment({ ...base, unit_cost: BigInt(-1) }, BATCHES),
    ).toContain("tidak boleh negatif");
    expect(
      validateStockAdjustment({ ...base, qty_change: -6 }, BATCHES),
    ).toContain("tidak mencukupi");
  });
});

describe("Rencana Penyesuaian Stok", () => {
  it("membuat batch baru untuk selisih positif", () => {
    const plan = planStockAdjustment(
      { variant_id: "v1", qty_change: 3, unit_cost: BigInt(11500), reason: "Lebih stok" },
      BATCHES,
    );

    expect(plan.direction).toBe("IN");
    expect(plan.unit_cost).toBe(BigInt(11500));
    expect(plan.allocations).toHaveLength(0);
  });

  it("memotong batch FIFO untuk selisih negatif", () => {
    const plan = planStockAdjustment(
      { variant_id: "v1", qty_change: -4, reason: "Stok hilang" },
      BATCHES,
    );

    expect(plan.direction).toBe("OUT");
    expect(plan.allocations.map((item) => item.batch_id)).toEqual([
      "batch-a",
      "batch-b",
    ]);
    expect(plan.allocations[0]?.allocated_qty.toString()).toBe("2");
    expect(plan.allocations[1]?.allocated_qty.toString()).toBe("2");
    expect(plan.total_hpp).toBe(BigInt(44000));
  });
});

describe("Nilai Aset dan Stok Menipis", () => {
  it("menghitung nilai aset produk dan kemasan", () => {
    const valuation = calculateInventoryValuation({
      product_batches: [
        { remaining_qty: 2, unit_cost: BigInt(10000) },
        { remaining_qty: 1.5, unit_cost: BigInt(12000) },
      ],
      packaging_materials: [
        { current_stock: 10, average_unit_cost: 500 },
        { current_stock: 3.25, average_unit_cost: 2000 },
      ],
    });

    expect(valuation.productAssetValue).toBe(BigInt(38000));
    expect(valuation.packagingAssetValue).toBe(BigInt(11500));
    expect(valuation.totalAssetValue).toBe(BigInt(49500));
  });

  it("mendeteksi stok menipis dengan batas kosong diabaikan", () => {
    const alerts = detectLowStock([
      { id: "a", name: "A", stock_qty: 5, min_stock: 5 },
      { id: "b", name: "B", stock_qty: 6, min_stock: 5 },
      { id: "c", name: "C", stock_qty: 0, min_stock: null },
    ]);

    expect(alerts.map((item) => item.id)).toEqual(["a"]);
    expect(alerts[0]?.min_stock.toString()).toBe("5");
  });
});

describe("Klasifikasi Mutasi Stok", () => {
  it("memetakan tipe mutasi produk dan kemasan", () => {
    expect(classifyStockMovement(StockMovementType.PENERIMAAN_PEMBELIAN)).toBe("IN");
    expect(classifyStockMovement(StockMovementType.PENJUALAN)).toBe("OUT");
    expect(classifyStockMovement(StockMovementType.PENYESUAIAN_STOK)).toBe(
      "ADJUSTMENT",
    );
    expect(
      classifyPackagingMovement(PackagingMovementType.PEMBELIAN),
    ).toBe("IN");
    expect(
      classifyPackagingMovement(PackagingMovementType.PEMAKAIAN_PENJUALAN),
    ).toBe("OUT");
    expect(
      classifyPackagingMovement(PackagingMovementType.PENYESUAIAN_STOK),
    ).toBe("ADJUSTMENT");
  });
});
