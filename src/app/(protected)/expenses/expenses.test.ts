import { describe, expect, it } from "vitest";
import {
  aggregateExpenses,
  calculateProfitLoss,
  validateExpenseCategoryName,
  validateExpenseInput,
  validateExpenseVoidReason,
} from "./expense-rules";

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
