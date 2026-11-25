import { describe, expect, it } from "vitest";
import {
  allocateSaleItems,
  buildSalesWhere,
  calculateAdminFeeEstimate,
  calculateAllocationSubtotalHpp,
  calculateProductCogs,
  calculateSaleItemSubtotal,
  calculateSalePackagingUsage,
  calculateSaleSummary,
  planSaleVoidPackagingRestorations,
  planSaleVoidRestorations,
  validateSaleItems,
  validateSaleVoidEligibility,
  validateSaleVoidReason,
} from "./sales-rules";
import {
  DEFAULT_PACKAGE_COUNT,
  resolvePackageCount,
} from "./sales-form-helpers";
import {
  resolveDefaultSalesChannel,
  resolveDefaultSalesChannelId,
} from "./sales-channel-helpers";

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

  it("menjumlahkan material tambahan yang juga termasuk material standar ukuran paket", () => {
    const result = calculateSalePackagingUsage({
      materials: MATERIALS,
      packageSizeItems: [
        { packaging_material_id: "kardus", default_usage_qty: 1 },
      ],
      packageCount: 2,
      additionalItems: [
        { packaging_material_id: "kardus", actual_usage_qty: 3 },
      ],
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.standard_usage_qty.toString()).toBe("1");
    expect(result.lines[0]?.actual_usage_qty.toString()).toBe("5");
    expect(result.lines[0]?.calculated_hpp).toBe(BigInt(25000));
    expect(result.packagingCogs).toBe(BigInt(25000));
  });

  it("menolak material tambahan overlap yang negatif atau membuat stok kurang", () => {
    expect(() =>
      calculateSalePackagingUsage({
        materials: MATERIALS,
        packageSizeItems: [
          { packaging_material_id: "kardus", default_usage_qty: 1 },
        ],
        packageCount: 2,
        additionalItems: [
          { packaging_material_id: "kardus", actual_usage_qty: -1 },
        ],
      }),
    ).toThrow(/tidak boleh negatif/);
    expect(() =>
      calculateSalePackagingUsage({
        materials: MATERIALS,
        packageSizeItems: [
          { packaging_material_id: "kardus", default_usage_qty: 1 },
        ],
        packageCount: 2,
        additionalItems: [
          { packaging_material_id: "kardus", actual_usage_qty: 9 },
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

describe("Kanal Penjualan Default", () => {
  const channels = [
    { id: "shopee", name: "Shopee", is_marketplace: true },
    { id: "offline", name: "Toko Offline", is_marketplace: false },
    { id: "whatsapp", name: "WhatsApp", is_marketplace: false },
  ];

  it("memilih Toko Offline meskipun bukan kanal pertama", () => {
    expect(resolveDefaultSalesChannel(channels)?.id).toBe("offline");
    expect(resolveDefaultSalesChannelId(channels)).toBe("offline");
  });

  it("mengutamakan kanal non-marketplace sebelum jatuh ke kanal pertama", () => {
    expect(
      resolveDefaultSalesChannelId(
        channels.filter((channel) => channel.name !== "Toko Offline"),
      ),
    ).toBe("whatsapp");
    expect(
      resolveDefaultSalesChannelId([
        { id: "shopee", name: "Shopee", is_marketplace: true },
        {
          id: "offline-online",
          name: "Toko Offline",
          is_marketplace: true,
        },
        { id: "whatsapp", name: "WhatsApp", is_marketplace: false },
      ]),
    ).toBe("whatsapp");
  });

  it("jatuh ke kanal pertama hanya ketika semua kanal marketplace", () => {
    expect(
      resolveDefaultSalesChannelId([
        { id: "shopee", name: "Shopee", is_marketplace: true },
        { id: "tokopedia", name: "Tokopedia", is_marketplace: true },
      ]),
    ).toBe("shopee");
  });

  it("mengembalikan null atau string kosong ketika tidak ada kanal aktif", () => {
    expect(resolveDefaultSalesChannel([])).toBeNull();
    expect(resolveDefaultSalesChannelId([])).toBe("");
  });
});

describe("Jumlah Paket dan Filter Daftar Penjualan", () => {
  const CHANNEL_ID = "11111111-1111-4111-8111-111111111111";

  it("memakai satu paket sebagai fallback UI dan server", () => {
    expect(DEFAULT_PACKAGE_COUNT).toBe(1);
    expect(resolvePackageCount("")).toBe(1);
    expect(resolvePackageCount(null)).toBe(1);
    expect(resolvePackageCount(undefined)).toBe(1);
    expect(resolvePackageCount("2")).toBe(2);
    expect(resolvePackageCount(0)).toBe(0);
  });

  it("hanya memakai UUID valid dan tanggal valid sebagai filter", () => {
    expect(buildSalesWhere({ channelId: CHANNEL_ID }).sales_channel_id).toBe(
      CHANNEL_ID,
    );
    expect(
      buildSalesWhere({ channelId: "bukan-uuid" }).sales_channel_id,
    ).toBeUndefined();
    expect(buildSalesWhere({ status: "Selesai" }).order_status).toBe("Selesai");
    expect(
      buildSalesWhere({ status: "Status-Asing" }).order_status,
    ).toBeUndefined();

    const bounds = buildSalesWhere({
      dateFrom: "2026-03-01",
      dateTo: "2026-03-03",
    }).transaction_date;
    expect(bounds).toMatchObject({
      gte: new Date(2026, 2, 1),
      lte: new Date(2026, 2, 3, 23, 59, 59, 999),
    });
    expect(
      buildSalesWhere({ dateFrom: "2026-02-30" }).transaction_date,
    ).toBeUndefined();
    expect(buildSalesWhere({ dateTo: "2026-13-01" }).transaction_date).toBeUndefined();
    expect(
      buildSalesWhere({ search: " INV/001 " }).OR?.[0],
    ).toMatchObject({ transaction_number: { contains: "INV/001" } });
  });
});

describe("HPP Alokasi Netto dan Pembatalan Penjualan", () => {
  const ELIGIBLE = {
    order_status: "Selesai",
    is_stock_deducted: true,
    has_active_customer_return: false,
    has_active_settlement: false,
  };

  it("menghitung subtotal HPP dari qty alokasi dikurangi qty dibatalkan", () => {
    expect(calculateAllocationSubtotalHpp(30000, 2, "0.5")).toBe(BigInt(45000));
    expect(calculateAllocationSubtotalHpp(30000, 2, 2)).toBe(BigInt(0));
    expect(calculateAllocationSubtotalHpp(30000, 1, 3)).toBe(BigInt(0));
  });

  it("menolak pembatalan transaksi yang tidak memenuhi syarat", () => {
    expect(validateSaleVoidEligibility(ELIGIBLE)).toBeNull();
    expect(
      validateSaleVoidEligibility({ ...ELIGIBLE, order_status: "Dibatalkan" }),
    ).toContain("sudah dibatalkan");
    expect(
      validateSaleVoidEligibility({ ...ELIGIBLE, order_status: "Baru" }),
    ).toContain("selesai");
    expect(
      validateSaleVoidEligibility({ ...ELIGIBLE, is_stock_deducted: false }),
    ).toContain("tidak dipotong");
    expect(
      validateSaleVoidEligibility({
        ...ELIGIBLE,
        has_active_customer_return: true,
      }),
    ).toContain("retur aktif");
    expect(
      validateSaleVoidEligibility({ ...ELIGIBLE, has_active_settlement: true }),
    ).toContain("settlement aktif");
  });

  it("memvalidasi alasan pembatalan", () => {
    expect(validateSaleVoidReason(" Salah input ")).toBeNull();
    expect(validateSaleVoidReason("  ")).toContain("wajib diisi");
    expect(validateSaleVoidReason("x".repeat(501))).toContain(
      "terlalu panjang",
    );
  });

  it("hanya merencanakan pengembalian sisa alokasi dan kemasan yang masih dipotong", () => {
    const restorations = planSaleVoidRestorations([
      {
        id: "a1",
        variant_id: "v1",
        batch_id: "b1",
        allocated_qty: 2,
        reversed_qty: "0.5",
      },
      {
        id: "a2",
        variant_id: "v1",
        batch_id: "b2",
        allocated_qty: 1,
        reversed_qty: 1,
      },
      {
        id: "a3",
        variant_id: "v2",
        batch_id: "b3",
        allocated_qty: 2,
        reversed_qty: 3,
      },
    ]);
    expect(
      restorations.map((item) => [item.allocation_id, item.qty.toString()]),
    ).toEqual([["a1", "1.5"]]);

    const packagingRestorations = planSaleVoidPackagingRestorations([
      {
        id: "u1",
        packaging_material_id: "kardus",
        actual_usage_qty: 2,
        is_stock_deducted: true,
        is_stock_restored: false,
      },
      {
        id: "u2",
        packaging_material_id: "bubble",
        actual_usage_qty: 3,
        is_stock_deducted: true,
        is_stock_restored: true,
      },
      {
        id: "u3",
        packaging_material_id: "lakban",
        actual_usage_qty: 1,
        is_stock_deducted: false,
        is_stock_restored: false,
      },
    ]);
    expect(packagingRestorations.map((item) => item.id)).toEqual(["u1"]);
  });
});
