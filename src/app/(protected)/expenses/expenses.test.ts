import { describe, expect, it } from "vitest";
import { resolveExpenseDateFilter } from "./expense-filter-helpers";
import {
  aggregateExpenses,
  calculateProfitLoss,
  validateExpenseCategoryName,
  validateExpenseInput,
  validateExpenseVoidReason,
} from "./expense-rules";
import { calculateExpenseProfit } from "./expense-profit-helpers";

const CATEGORY_IDS = ["listrik", "gaji", "transport"] as const;

const EXPENSES = [
  {
    expense_category_id: "listrik",
    category_name: "Listrik & Air",
    expense_date: "2026-01-05",
    amount: BigInt(1000000),
  },
  {
    expense_category_id: "listrik",
    category_name: "Listrik & Air",
    expense_date: "2026-02-05",
    amount: BigInt(1250000),
  },
  {
    expense_category_id: "gaji",
    category_name: "Gaji & Upah",
    expense_date: "2026-02-10",
    amount: BigInt(3000000),
  },
  {
    expense_category_id: "transport",
    category_name: "Transportasi",
    expense_date: "2026-02-18",
    amount: BigInt(750000),
  },
  {
    expense_category_id: "listrik",
    category_name: "Listrik & Air",
    expense_date: "2026-02-20",
    amount: BigInt(500000),
    is_void: true,
  },
];

describe("Validasi Pengeluaran Operasional", () => {
  it("menerima input yang valid", () => {
    expect(
      validateExpenseInput(
        {
          expense_category_id: "listrik",
          expense_date: "2026-02-24",
          amount: "250000",
          description: "Pembayaran listrik toko",
        },
        { validCategoryIds: CATEGORY_IDS },
      ),
    ).toBeNull();
  });

  it("menolak deskripsi kosong, kategori invalid, tanggal invalid, dan nominal bukan positif", () => {
    const base = {
      expense_category_id: "listrik",
      expense_date: "2026-02-24",
      amount: 250000,
      description: "Listrik toko",
    };

    expect(validateExpenseInput({ ...base, description: "  " })).toContain(
      "wajib diisi",
    );
    expect(validateExpenseInput({ ...base, expense_category_id: "" })).toContain(
      "wajib dipilih",
    );
    expect(
      validateExpenseInput(base, { validCategoryIds: ["gaji"] }),
    ).toContain("tidak valid");
    expect(validateExpenseInput({ ...base, expense_date: "2026-02-30" })).toContain(
      "Tanggal pengeluaran tidak valid",
    );
    expect(validateExpenseInput({ ...base, amount: 0 })).toContain(
      "lebih dari 0",
    );
    expect(validateExpenseInput({ ...base, amount: -1000 })).toContain(
      "lebih dari 0",
    );
    expect(validateExpenseInput({ ...base, amount: "12.5" })).toContain(
      "bilangan bulat",
    );
  });

  it("memvalidasi nama kategori", () => {
    expect(validateExpenseCategoryName("Listrik & Air")).toBeNull();
    expect(validateExpenseCategoryName("   ")).toContain("wajib diisi");
    expect(validateExpenseCategoryName("x".repeat(101))).toContain(
      "terlalu panjang",
    );
  });

  it("memvalidasi alasan pembatalan", () => {
    expect(validateExpenseVoidReason("Salah input nominal")).toBeNull();
    expect(validateExpenseVoidReason(" ")).toContain("wajib diisi");
    expect(validateExpenseVoidReason("x".repeat(501))).toContain(
      "terlalu panjang",
    );
  });
});

describe("Agregasi Pengeluaran Operasional", () => {
  it("mengabaikan void dan mengelompokkan total per kategori", () => {
    const result = aggregateExpenses(EXPENSES);

    expect(result.count).toBe(4);
    expect(result.total).toBe(BigInt(6000000));
    expect(result.byCategory).toEqual([
      {
        category_id: "gaji",
        category_name: "Gaji & Upah",
        count: 1,
        total: BigInt(3000000),
      },
      {
        category_id: "listrik",
        category_name: "Listrik & Air",
        count: 2,
        total: BigInt(2250000),
      },
      {
        category_id: "transport",
        category_name: "Transportasi",
        count: 1,
        total: BigInt(750000),
      },
    ]);
  });

  it("memfilter periode dan kategori", () => {
    const byPeriod = aggregateExpenses(EXPENSES, {
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
    });
    expect(byPeriod.count).toBe(3);
    expect(byPeriod.total).toBe(BigInt(5000000));

    const byCategory = aggregateExpenses(EXPENSES, { categoryId: "listrik" });
    expect(byCategory.count).toBe(2);
    expect(byCategory.total).toBe(BigInt(2250000));
  });

  it("menyertakan void bila diminta dan menolak periode tidak valid", () => {
    const withVoid = aggregateExpenses(EXPENSES, { includeVoid: true });
    expect(withVoid.count).toBe(5);
    expect(withVoid.total).toBe(BigInt(6500000));

    expect(() =>
      aggregateExpenses(EXPENSES, { dateFrom: "2026-13-01" }),
    ).toThrow("Tanggal awal periode tidak valid.");
  });
});

describe("Laporan Laba Rugi Ringkas", () => {
  it("menghitung laba bersih positif", () => {
    const report = calculateProfitLoss({
      totalRevenue: BigInt(10000000),
      productCogs: BigInt(4000000),
      packagingCogs: BigInt(500000),
      totalOperatingExpenses: BigInt(2000000),
    });

    expect(report.totalCogs).toBe(BigInt(4500000));
    expect(report.grossProfit).toBe(BigInt(5500000));
    expect(report.netProfit).toBe(BigInt(3500000));
  });

  it("menghasilkan nol saat pendapatan sama dengan seluruh biaya", () => {
    const report = calculateProfitLoss({
      totalRevenue: "10000000",
      productCogs: "4000000",
      packagingCogs: "2000000",
      totalOperatingExpenses: "4000000",
    });

    expect(report.grossProfit).toBe(BigInt(4000000));
    expect(report.netProfit).toBe(BigInt(0));
  });

  it("menghasilkan nilai negatif saat rugi", () => {
    const report = calculateProfitLoss({
      totalRevenue: 10000000,
      productCogs: 3000000,
      packagingCogs: 2000000,
      totalOperatingExpenses: 7000000,
    });

    expect(report.grossProfit).toBe(BigInt(5000000));
    expect(report.netProfit).toBe(BigInt(-2000000));
  });

  it("menolak biaya negatif", () => {
    expect(() =>
      calculateProfitLoss({
        totalRevenue: BigInt(10000000),
        productCogs: BigInt(0),
        packagingCogs: BigInt(0),
        totalOperatingExpenses: BigInt(-1),
      }),
    ).toThrow("Biaya operasional tidak boleh negatif.");
  });
});

describe("Filter Tanggal Pengeluaran", () => {
  const fallback = {
    from: new Date(2026, 1, 1),
    to: new Date(2026, 1, 10),
  };

  it("memakai rentang bawaan saat filter kosong", () => {
    const result = resolveExpenseDateFilter("", "", fallback);
    expect(result.error).toBeNull();
    expect(result.bounds?.gte).toEqual(fallback.from);
    expect(result.bounds?.lte?.getDate()).toBe(10);
    expect(result.bounds?.lte?.getHours()).toBe(23);
  });

  it("menukar rentang yang terbalik", () => {
    const result = resolveExpenseDateFilter("2026-02-09", "2026-02-02", fallback);
    expect(result.error).toBeNull();
    expect(result.bounds?.gte?.getDate()).toBe(2);
    expect(result.bounds?.lte?.getDate()).toBe(9);
    expect(result.from.getDate()).toBe(2);
    expect(result.to.getDate()).toBe(9);
  });

  it("menolak tanggal invalid", () => {
    const result = resolveExpenseDateFilter("2026-13-40", "", fallback);
    expect(result.bounds).toBeNull();
    expect(result.error).toContain("tidak valid");
    expect(result.from).toEqual(fallback.from);
  });
});

describe("Laba Pengeluaran Sesuai Dashboard", () => {
  const period = {
    from: new Date(2026, 1, 1),
    to: new Date(2026, 1, 28),
  };

  const sales = [
    {
      id: "sale-1",
      transaction_date: new Date(2026, 1, 3),
      order_status: "Selesai",
      total_amount: "100000",
      admin_fee_estimate_amount: "3000",
      admin_fee_actual_amount: "5000",
      items: [{ total_hpp_fifo: "30000" }],
      packaging_usages: [{ calculated_hpp: "2000", adjusted_hpp: null }],
    },
    {
      id: "sale-2",
      transaction_date: new Date(2026, 1, 4),
      order_status: "Selesai",
      total_amount: "50000",
      admin_fee_estimate_amount: "2000",
      admin_fee_actual_amount: null,
      items: [{ total_hpp_fifo: "15000" }],
      packaging_usages: [{ calculated_hpp: "1000", adjusted_hpp: null }],
    },
    {
      id: "sale-cancelled",
      transaction_date: new Date(2026, 1, 5),
      order_status: "Dibatalkan",
      total_amount: "999999",
      admin_fee_estimate_amount: "9000",
      items: [{ total_hpp_fifo: "900000" }],
      packaging_usages: [],
    },
  ];

  it("menghitung laba dengan komponen dashboard yang sama", () => {
    const report = calculateExpenseProfit({
      ...period,
      sales,
      refunds: [
        {
          refund_paid_date: new Date(2026, 1, 6),
          refund_amount: "4000",
          fund_status: "Dana_dikembalikan",
        },
        {
          refund_paid_date: null,
          refund_amount: "9999",
          fund_status: "Belum_diproses",
        },
      ],
      expenses: [
        { expense_date: new Date(2026, 1, 7), amount: "7000", is_void: false },
        { expense_date: new Date(2026, 1, 8), amount: "10000", is_void: true },
      ],
      writeOffs: [
        { created_at: new Date(2026, 1, 9), loss_value: "3000" },
        { created_at: new Date(2026, 2, 1), loss_value: "5000" },
      ],
    });

    expect(report.totalRevenue).toBe(BigInt(150000));
    expect(report.productCogs).toBe(BigInt(45000));
    expect(report.packagingCogs).toBe(BigInt(3000));
    expect(report.adminFee).toBe(BigInt(7000));
    expect(report.refunds).toBe(BigInt(4000));
    expect(report.writeOffLoss).toBe(BigInt(3000));
    expect(report.totalOperatingExpenses).toBe(BigInt(7000));
    expect(report.grossProfit).toBe(BigInt(91000));
    expect(report.netProfit).toBe(BigInt(81000));
  });

  it("memakai HPP kemasan yang sudah disesuaikan", () => {
    const report = calculateExpenseProfit({
      ...period,
      sales: [
        {
          ...sales[0]!,
          packaging_usages: [
            { calculated_hpp: "2000", adjusted_hpp: "2500" },
          ],
        },
      ],
      refunds: [],
      expenses: [],
      writeOffs: [],
    });

    expect(report.packagingCogs).toBe(BigInt(2500));
    expect(report.grossProfit).toBe(BigInt(62500));
    expect(report.netProfit).toBe(BigInt(62500));
  });
});
