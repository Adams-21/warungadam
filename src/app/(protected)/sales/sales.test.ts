import { describe, expect, it } from "vitest";
import {
  allocateSaleItems,
  calculateAdminFeeEstimate,
  calculateProductCogs,
  calculateSaleItemSubtotal,
  calculateSalePackagingUsage,
  calculateSaleSummary,
  validateSaleItems,
} from "./sales-rules";

const MATERIALS = [
  { id: "kardus", name: "Kardus", stock_qty: 10, average_unit_cost: 5000 },
  { id: "bubble", name: "Bubble wrap", stock_qty: 100, average_unit_cost: 120 },
  { id: "lakban", name: "Lakban", stock_qty: 5, average_unit_cost: 2000 },
];

const BATCHES = [
  {
    id: "batch-a",
    received_at: "2026-01-01T00:00:00.000Z",
    remaining_qty: 2,
    unit_cost: BigInt(30000),
  },
  {
    id: "batch-b",
    received_at: "2026-02-01T00:00:00.000Z",
    remaining_qty: 5,
    unit_cost: BigInt(35000),
  },
];

describe("Validasi Item Penjualan", () => {
  it("menolak item kosong, qty <= 0, harga <= 0, diskon berlebih, duplikat, dan stok kurang", () => {
    expect(validateSaleItems([])).toContain("Minimal satu item");
    expect(
      validateSaleItems([
        { variant_id: "v1", qty: 0, unit_selling_price: 1000 },
      ]),
    ).toContain("lebih dari 0");
    expect(
      validateSaleItems([
        { variant_id: "v1", qty: 1, unit_selling_price: 0 },
      ]),
    ).toContain("Harga jual");
    expect(
      validateSaleItems([
        {
          variant_id: "v1",
          qty: 1,
          unit_selling_price: 10000,
          discount_amount: 10001,
        },
      ]),
    ).toContain("Diskon item melebihi");
    expect(
      validateSaleItems([
        { variant_id: "v1", qty: 1, unit_selling_price: 1000 },
        { variant_id: "v1", qty: 1, unit_selling_price: 1000 },
      ]),
    ).toContain("duplikat");
    expect(
      validateSaleItems(
        [{ variant_id: "v1", qty: 3, unit_selling_price: 1000 }],
        { v1: 2 },
      ),
    ).toContain("Stok produk tidak mencukupi");
  });

  it("menerima item valid dan menghitung subtotal neto per item", () => {
    expect(
      validateSaleItems([
        {
          variant_id: "v1",
          qty: 2,
          unit_selling_price: 50000,
          discount_amount: 5000,
        },
      ]),
    ).toBeNull();
    expect(
      calculateSaleItemSubtotal({
        variant_id: "v1",
        qty: 2,
        unit_selling_price: 50000,
        discount_amount: 5000,
      }),
    ).toBe(BigInt(95000));
  });
});

describe("Alokasi FIFO dan HPP Produk", () => {
  it("mengalokasikan batch FIFO dan menjumlahkan HPP produk", () => {
    const allocations = allocateSaleItems([
      {
        variant_id: "v1",
        qty: 3,
        unit_selling_price: 50000,
        discount_amount: 10000,
        batches: BATCHES,
      },
    ]);

    expect(
      allocations[0].result.allocations.map((item) => item.batch_id),
    ).toEqual(["batch-a", "batch-b"]);
    expect(
      allocations[0].result.allocations.map((item) =>
        item.allocated_qty.toString(),
      ),
    ).toEqual(["2", "1"]);
    expect(calculateProductCogs(allocations)).toBe(BigInt(95000));
  });

  it("menolak alokasi ketika stok batch tidak mencukupi", () => {
    expect(() =>
      allocateSaleItems([
        {
          variant_id: "v1",
          qty: 8,
          unit_selling_price: 50000,
          batches: BATCHES,
        },
      ]),
    ).toThrow(/tidak mencukupi/);
  });
});

describe("HPP dan Validasi Stok Kemasan", () => {
  it("menghitung kebutuhan kemasan dari PackageSize, penyesuaian aktual, dan material tambahan", () => {
    const result = calculateSalePackagingUsage({
      materials: MATERIALS,
      packageSizeItems: [
        { packaging_material_id: "kardus", default_usage_qty: 1 },
        { packaging_material_id: "bubble", default_usage_qty: 20 },
      ],
      packageCount: 2,
      overrides: [
        { packaging_material_id: "bubble", actual_usage_qty: 30 },
      ],
      additionalItems: [
        { packaging_material_id: "lakban", actual_usage_qty: "1.5" },
      ],
    });

    expect(result.lines.map((line) => line.packaging_material_id)).toEqual([
      "kardus",
      "bubble",
      "lakban",
    ]);
    expect(
      result.lines.map((line) => line.actual_usage_qty.toString()),
    ).toEqual(["2", "30", "1.5"]);
    expect(result.lines.map((line) => line.calculated_hpp)).toEqual([
      BigInt(10000),
      BigInt(3600),
      BigInt(3000),
    ]);
    expect(result.packagingCogs).toBe(BigInt(16600));
  });

  it("menolak jumlah paket <= 0, pemakaian negatif, dan stok kemasan kurang", () => {
    expect(() =>
      calculateSalePackagingUsage({
        materials: MATERIALS,
        packageSizeItems: [
          { packaging_material_id: "kardus", default_usage_qty: 1 },
        ],
        packageCount: 0,
      }),
    ).toThrow(/Jumlah paket/);
    expect(() =>
      calculateSalePackagingUsage({
        materials: MATERIALS,
        packageSizeItems: [
          { packaging_material_id: "kardus", default_usage_qty: 1 },
        ],
        overrides: [
          { packaging_material_id: "kardus", actual_usage_qty: -1 },
        ],
      }),
    ).toThrow(/tidak boleh negatif/);
    expect(() =>
      calculateSalePackagingUsage({
        materials: MATERIALS,
        packageSizeItems: [
          { packaging_material_id: "bubble", default_usage_qty: 200 },
        ],
      }),
    ).toThrow(/Stok kemasan tidak mencukupi/);
  });
});

describe("Ringkasan Transaksi Penjualan", () => {
  it("menghitung total pendapatan, HPP, laba kotor, dan estimasi biaya admin", () => {
    const items = [
      {
        variant_id: "v1",
        qty: 2,
        unit_selling_price: 50000,
        discount_amount: 5000,
      },
      { variant_id: "v2", qty: "1.5", unit_selling_price: 20000 },
    ];
    const allocations = allocateSaleItems([
      {
        ...items[0],
        batches: [
          {
            id: "batch-c",
            received_at: "2026-01-01T00:00:00.000Z",
            remaining_qty: 2,
            unit_cost: BigInt(35000),
          },
        ],
      },
      {
        ...items[1],
        batches: [
          {
            id: "batch-d",
            received_at: "2026-01-02T00:00:00.000Z",
            remaining_qty: 2,
            unit_cost: BigInt(10000),
          },
        ],
      },
    ]);

    const adminFeeEstimate = calculateAdminFeeEstimate({
      subtotal: BigInt(125000),
      discount: BigInt(5000),
      isMarketplace: true,
      rate: 22,
    });
    const summary = calculateSaleSummary({
      items,
      allocations,
      packagingCogs: BigInt(16600),
      discountAmount: BigInt(5000),
      additionalFeeAmount: BigInt(2500),
      adminFeeEstimate,
    });

    expect(summary.subtotal).toBe(BigInt(125000));
    expect(summary.totalRevenue).toBe(BigInt(122500));
    expect(summary.productCogs).toBe(BigInt(85000));
    expect(summary.packagingCogs).toBe(BigInt(16600));
    expect(summary.totalCogs).toBe(BigInt(101600));
    expect(summary.grossProfit).toBe(BigInt(20900));
    expect(summary.adminFeeEstimate).toBe(BigInt(26400));
    expect(summary.netRevenue).toBe(BigInt(96100));
    expect(summary.netGrossProfit).toBe(BigInt(-5500));

    expect(
      calculateAdminFeeEstimate({
        subtotal: BigInt(125000),
        discount: BigInt(5000),
        isMarketplace: false,
      }),
    ).toBe(BigInt(0));
  });

  it("menolak diskon transaksi melebihi subtotal", () => {
    expect(() =>
      calculateSaleSummary({
        items: [
          { variant_id: "v1", qty: 1, unit_selling_price: 10000 },
        ],
        allocations: [],
        discountAmount: BigInt(10001),
      }),
    ).toThrow(/Diskon transaksi melebihi subtotal/);
  });
});
