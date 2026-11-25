import { describe, expect, it } from "vitest";
import {
  aggregateDashboard,
  calculateDashboardSaleCogs,
} from "./dashboard-rules";

const BASE_PERIOD = {
  from: "2026-03-01",
  to: "2026-03-03",
  asOf: "2026-03-05",
};

const SALES = [
  {
    id: "sale-1",
    transaction_number: "TRX-001",
    transaction_date: "2026-03-01",
    order_status: "Selesai",
    payment_status: "Dibayar",
    settlement_status: "Sudah_cair",
    total_amount: BigInt(1_000_000),
    product_cogs: BigInt(400_000),
    packaging_cogs: BigInt(50_000),
    admin_fee_estimate_amount: BigInt(22_000),
    admin_fee_actual_amount: BigInt(20_000),
  },
  {
    id: "sale-2",
    transaction_number: "TRX-002",
    transaction_date: "2026-03-02",
    order_status: "Selesai",
    payment_status: "Belum_dibayar",
    settlement_status: "Belum_cair",
    total_amount: BigInt(500_000),
    product_cogs: BigInt(200_000),
    packaging_cogs: BigInt(25_000),
    admin_fee_estimate_amount: BigInt(0),
    admin_fee_actual_amount: null,
  },
  {
    id: "sale-3",
    transaction_number: "TRX-003",
    transaction_date: "2026-03-02",
    order_status: "Dibatalkan",
    total_amount: BigInt(999_000),
    product_cogs: BigInt(0),
    packaging_cogs: BigInt(0),
    admin_fee_estimate_amount: BigInt(0),
  },
  {
    id: "sale-4",
    transaction_number: "TRX-004",
    transaction_date: "2026-02-28",
    order_status: "Selesai",
    total_amount: BigInt(777_000),
    product_cogs: BigInt(0),
    packaging_cogs: BigInt(0),
    admin_fee_estimate_amount: BigInt(0),
  },
];

describe("Agregasi KPI Dashboard", () => {
  it("menghitung KPI periode dengan refund, biaya admin, dan penghapusan stok", () => {
    const result = aggregateDashboard({
      period: BASE_PERIOD,
      sales: SALES,
      refunds: [
        {
          refund_paid_date: "2026-03-02",
          refund_amount: BigInt(50_000),
          fund_status: "Dana_dikembalikan",
        },
        {
          refund_paid_date: "2026-03-02",
          refund_amount: BigInt(999_000),
          fund_status: "Dana_tetap_hak_penjual",
        },
      ],
      expenses: [
        { expense_date: "2026-03-03", amount: BigInt(100_000), is_void: false },
        { expense_date: "2026-03-03", amount: BigInt(1_000_000), is_void: true },
      ],
      write_offs: [
        { created_at: "2026-03-03", loss_value: BigInt(30_000) },
      ],
    });

    expect(result.kpis.transaction_count).toBe(2);
    expect(result.kpis.total_sales).toBe(BigInt(1_500_000));
    expect(result.kpis.product_cogs).toBe(BigInt(600_000));
    expect(result.kpis.packaging_cogs).toBe(BigInt(75_000));
    expect(result.kpis.total_cogs).toBe(BigInt(675_000));
    expect(result.kpis.admin_fee).toBe(BigInt(20_000));
    expect(result.kpis.refunds).toBe(BigInt(50_000));
    expect(result.kpis.net_revenue).toBe(BigInt(1_430_000));
    expect(result.kpis.gross_profit).toBe(BigInt(755_000));
    expect(result.kpis.operating_expenses).toBe(BigInt(100_000));
    expect(result.kpis.write_off_loss).toBe(BigInt(30_000));
    expect(result.kpis.net_profit).toBe(BigInt(625_000));
  });

  it("mengurangi HPP produk dengan restored HPP retur layak jual pada KPI", () => {
    const cogs = calculateDashboardSaleCogs({
      items: [
        {
          total_hpp_fifo: BigInt(400_000),
          customer_return_items: [
            { restored_hpp_amount: BigInt(40_000) },
            { restored_hpp_amount: BigInt(10_000) },
          ],
        },
      ],
      packaging_usages: [{ calculated_hpp: BigInt(50_000) }],
    });
    const result = aggregateDashboard({
      period: BASE_PERIOD,
      sales: [
        {
          id: "sale-return",
          transaction_number: "TRX-RET",
          transaction_date: "2026-03-01",
          order_status: "Selesai",
          total_amount: BigInt(1_000_000),
          product_cogs: cogs.product_cogs,
          packaging_cogs: cogs.packaging_cogs,
          admin_fee_estimate_amount: BigInt(22_000),
          admin_fee_actual_amount: BigInt(20_000),
        },
      ],
    });

    expect(cogs.product_cogs).toBe(BigInt(350_000));
    expect(result.kpis.product_cogs).toBe(BigInt(350_000));
    expect(result.kpis.total_cogs).toBe(BigInt(400_000));
    expect(result.kpis.gross_profit).toBe(BigInt(580_000));
    expect(result.kpis.net_profit).toBe(BigInt(580_000));
    expect(result.daily_trend[0]?.gross_profit).toBe(BigInt(580_000));
  });

  it("tidak mengurangi HPP produk saat retur tidak memulihkan HPP", () => {
    const cogs = calculateDashboardSaleCogs({
      items: [
        {
          total_hpp_fifo: BigInt(400_000),
          customer_return_items: [{ restored_hpp_amount: BigInt(0) }],
        },
      ],
      packaging_usages: [{ calculated_hpp: BigInt(50_000) }],
    });
    const result = aggregateDashboard({
      period: BASE_PERIOD,
      sales: [
        {
          id: "sale-no-restore",
          transaction_number: "TRX-NO-RET",
          transaction_date: "2026-03-01",
          order_status: "Selesai",
          total_amount: BigInt(1_000_000),
          product_cogs: cogs.product_cogs,
          packaging_cogs: cogs.packaging_cogs,
          admin_fee_estimate_amount: BigInt(20_000),
        },
      ],
    });

    expect(cogs.product_cogs).toBe(BigInt(400_000));
    expect(result.kpis.product_cogs).toBe(BigInt(400_000));
    expect(result.kpis.gross_profit).toBe(BigInt(530_000));
    expect(result.daily_trend[0]?.gross_profit).toBe(BigInt(530_000));
  });

  it("menghitung nilai aset persediaan produk dan kemasan", () => {
    const result = aggregateDashboard({
      period: BASE_PERIOD,
      sales: [],
      product_batches: [
        { remaining_qty: 2, unit_cost: BigInt(10_000) },
        { remaining_qty: "1.5", unit_cost: BigInt(1_000) },
      ],
      packaging_materials: [
        { stock_qty: 3, average_unit_cost: 500 },
        { stock_qty: 2, average_unit_cost: 250 },
      ],
    });

    expect(result.kpis.product_asset_value).toBe(BigInt(21_500));
    expect(result.kpis.packaging_asset_value).toBe(BigInt(2_000));
    expect(result.kpis.total_asset_value).toBe(BigInt(23_500));
  });

  it("menolak periode terbalik", () => {
    expect(() =>
      aggregateDashboard({
        period: { from: "2026-03-03", to: "2026-03-01" },
        sales: [],
      }),
    ).toThrow("Tanggal awal tidak boleh setelah tanggal akhir.");
  });
});

describe("Peringatan Dashboard", () => {
  it("menampilkan stok menipis produk dan kemasan", () => {
    const result = aggregateDashboard({
      period: BASE_PERIOD,
      sales: [],
      low_stock_products: [
        { id: "v1", label: "Produk A", stock_qty: 5, min_stock: 10 },
        { id: "v2", label: "Produk B", stock_qty: 20, min_stock: 10 },
        { id: "v3", label: "Produk C", stock_qty: 1, min_stock: null },
      ],
      low_stock_packaging: [
        { id: "p1", label: "Kemasan X", stock_qty: 2, min_stock: 3 },
      ],
    });

    expect(result.low_stock_products).toHaveLength(1);
    expect(result.low_stock_products[0]).toMatchObject({
      id: "v1",
      stock_qty: 5,
      min_stock: 10,
    });
    expect(result.low_stock_packaging[0]?.label).toBe("Kemasan X");
  });

  it("memisahkan tagihan jatuh tempo dan belum lunas", () => {
    const result = aggregateDashboard({
      period: BASE_PERIOD,
      sales: [],
      bills: [
        {
          id: "po1",
          purchase_number: "PO-001",
          supplier_name: "Supplier A",
          purchase_date: "2026-02-20",
          due_date: "2026-03-01",
          remaining_amount: BigInt(100_000),
        },
        {
          id: "po2",
          purchase_number: "PO-002",
          supplier_name: "Supplier B",
          purchase_date: "2026-02-21",
          due_date: "2026-03-10",
          remaining_amount: BigInt(200_000),
        },
        {
          id: "po3",
          purchase_number: "PO-003",
          supplier_name: "Supplier C",
          purchase_date: "2026-02-22",
          due_date: null,
          remaining_amount: BigInt(50_000),
        },
        {
          id: "po4",
          purchase_number: "PO-004",
          supplier_name: "Supplier D",
          purchase_date: "2026-02-23",
          due_date: "2026-03-01",
          remaining_amount: BigInt(0),
        },
      ],
    });

    expect(result.unpaid_bills).toHaveLength(3);
    expect(result.overdue_bills.map((bill) => bill.id)).toEqual(["po1"]);
    expect(result.overdue_bills[0]?.remaining_amount).toBe(BigInt(100_000));
  });
});

describe("Tren Dashboard", () => {
  it("menghasilkan bucket harian berurutan dengan nilai laba per hari", () => {
    const result = aggregateDashboard({
      period: BASE_PERIOD,
      sales: SALES,
      refunds: [
        {
          refund_paid_date: "2026-03-02",
          refund_amount: BigInt(50_000),
          fund_status: "Dana_dikembalikan",
        },
      ],
      expenses: [{ expense_date: "2026-03-03", amount: BigInt(100_000) }],
      write_offs: [{ created_at: "2026-03-03", loss_value: BigInt(30_000) }],
    });

    expect(result.daily_trend.map((point) => point.key)).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
    ]);
    expect(result.daily_trend[0]?.total_sales).toBe(BigInt(1_000_000));
    expect(result.daily_trend[0]?.gross_profit).toBe(BigInt(530_000));
    expect(result.daily_trend[1]?.gross_profit).toBe(BigInt(225_000));
    expect(result.daily_trend[2]?.net_profit).toBe(BigInt(-130_000));
  });

  it("menggabungkan data menjadi tren bulanan", () => {
    const result = aggregateDashboard({
      period: {
        from: "2026-02-25",
        to: "2026-03-03",
        asOf: "2026-03-05",
      },
      sales: SALES,
    });

    expect(result.monthly_trend.map((point) => point.key)).toEqual([
      "2026-02",
      "2026-03",
    ]);
    expect(result.monthly_trend[1]?.total_sales).toBe(BigInt(1_500_000));
    expect(result.monthly_trend[1]?.gross_profit).toBe(BigInt(805_000));
  });

  it("menutup bucket harian dan bulanan tepat di akhir bulan", () => {
    const result = aggregateDashboard({
      period: {
        from: "2026-02-25",
        to: "2026-02-28",
        asOf: "2026-03-01",
      },
      sales: [
        {
          id: "sale-feb",
          transaction_number: "TRX-FEB",
          transaction_date: "2026-02-28",
          order_status: "Selesai",
          total_amount: BigInt(100_000),
          product_cogs: BigInt(0),
          packaging_cogs: BigInt(0),
          admin_fee_estimate_amount: BigInt(0),
        },
        {
          id: "sale-mar",
          transaction_number: "TRX-MAR",
          transaction_date: "2026-03-01",
          order_status: "Selesai",
          total_amount: BigInt(999_000),
          product_cogs: BigInt(0),
          packaging_cogs: BigInt(0),
          admin_fee_estimate_amount: BigInt(0),
        },
      ],
    });

    expect(result.daily_trend.map((point) => point.key)).toEqual([
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
    ]);
    expect(result.daily_trend[3]?.total_sales).toBe(BigInt(100_000));
    expect(result.monthly_trend.map((point) => point.key)).toEqual(["2026-02"]);
    expect(result.monthly_trend[0]?.total_sales).toBe(BigInt(100_000));
    expect(result.kpis.total_sales).toBe(BigInt(100_000));
  });

  it("mengembalikan lima transaksi terakhir di periode", () => {
    const dates = [
      "2026-03-01T01:00:00",
      "2026-03-01T02:00:00",
      "2026-03-02T01:00:00",
      "2026-03-02T02:00:00",
      "2026-03-03T01:00:00",
      "2026-03-03T02:00:00",
    ];
    const sales = Array.from({ length: 6 }, (_, index) => ({
      id: `sale-${index}`,
      transaction_number: `TRX-${index}`,
      transaction_date: dates[index]!,
      order_status: "Selesai",
      total_amount: BigInt((index + 1) * 1000),
      product_cogs: BigInt(0),
      packaging_cogs: BigInt(0),
      admin_fee_estimate_amount: BigInt(0),
    }));

    const result = aggregateDashboard({ period: BASE_PERIOD, sales });

    expect(result.recent_sales).toHaveLength(5);
    expect(result.recent_sales[0]?.transaction_number).toBe("TRX-5");
    expect(result.recent_sales[4]?.transaction_number).toBe("TRX-1");
  });
});

describe("calculateDashboardSaleCogs", () => {
  it("menjumlah HPP produk dan kemasan dari data penjualan", () => {
    const result = calculateDashboardSaleCogs({
      items: [
        { total_hpp_fifo: BigInt(100_000) },
        { total_hpp_fifo: BigInt(250_000) },
      ],
      packaging_usages: [
        { calculated_hpp: BigInt(10_000), adjusted_hpp: BigInt(12_000) },
        { calculated_hpp: BigInt(8_000), adjusted_hpp: null },
      ],
    });

    expect(result.product_cogs).toBe(BigInt(350_000));
    expect(result.packaging_cogs).toBe(BigInt(20_000));
  });

  it("menjumlah HPP bersih setelah retur layak jual", () => {
    const result = calculateDashboardSaleCogs({
      items: [
        {
          total_hpp_fifo: BigInt(100_000),
          customer_return_items: [
            { restored_hpp_amount: BigInt(12_000) },
            { restored_hpp_amount: BigInt(8_000) },
          ],
        },
        { total_hpp_fifo: BigInt(250_000) },
      ],
      packaging_usages: [{ calculated_hpp: BigInt(10_000) }],
    });

    expect(result.product_cogs).toBe(BigInt(330_000));
    expect(result.packaging_cogs).toBe(BigInt(10_000));
  });

  it("tidak mengubah HPP saat daftar retur kosong atau restored bernilai nol", () => {
    const result = calculateDashboardSaleCogs({
      items: [
        { total_hpp_fifo: BigInt(100_000), customer_return_items: [] },
        {
          total_hpp_fifo: BigInt(250_000),
          customer_return_items: [{ restored_hpp_amount: BigInt(0) }],
        },
      ],
      packaging_usages: [],
    });

    expect(result.product_cogs).toBe(BigInt(350_000));
  });

  it("mengembalikan nol untuk penjualan tanpa item dan kemasan", () => {
    const result = calculateDashboardSaleCogs({
      items: [],
      packaging_usages: [],
    });

    expect(result.product_cogs).toBe(BigInt(0));
    expect(result.packaging_cogs).toBe(BigInt(0));
  });
});
