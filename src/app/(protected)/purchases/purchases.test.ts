import { describe, expect, it } from "vitest";
import {
  allocateFifoBatches,
  calculateItemSubtotal,
  calculatePurchaseTotal,
  calculateWeightedAverageUnitCost,
  convertPurchaseToUsageQty,
  getRemainingQty,
  PURCHASE_FULFILLMENT_STATUS,
  resolvePurchaseStatus,
  resolveSupplierPayment,
  SUPPLIER_PAYMENT_STATUS,
  validatePurchaseLines,
  validateReceivedQty,
  validateSupplierPayment,
  type FifoBatch,
} from "./purchase-rules";

describe("Purchase Order (PO)", () => {
  it("menghitung total nilai PO dari daftar item (qty * unit_price)", () => {
    const total = calculatePurchaseTotal([
      { variant_id: "variant-a", ordered_qty: 2, unit_price: BigInt(15000) },
      { variant_id: "variant-b", ordered_qty: "1.5", unit_price: 20000 },
    ]);

    expect(total).toBe(BigInt(60000));
    expect(
      calculateItemSubtotal({ ordered_qty: "0.3333", unit_price: 10000 }),
    ).toBe(BigInt(3333));
  });

  it("menolak pembuatan PO tanpa item atau dengan qty <= 0", () => {
    expect(validatePurchaseLines([])).toContain("Minimal satu item");
    expect(
      validatePurchaseLines([
        { variant_id: "variant-a", ordered_qty: 0, unit_price: 1000 },
      ]),
    ).toContain("lebih dari 0");
    expect(
      validatePurchaseLines([
        { variant_id: "variant-a", ordered_qty: -2, unit_price: 1000 },
      ]),
    ).toContain("lebih dari 0");
    expect(
      validatePurchaseLines([
        { variant_id: "variant-a", ordered_qty: 2, unit_price: 1000 },
      ]),
    ).toBeNull();
  });

  it("menentukan status PO (CONFIRMED, PARTIAL, COMPLETED) dari qty pesanan vs qty diterima", () => {
    expect(
      resolvePurchaseStatus([{ ordered_qty: 10, received_qty: 0 }]),
    ).toBe(PURCHASE_FULFILLMENT_STATUS.CONFIRMED);
    expect(
      resolvePurchaseStatus([{ ordered_qty: 10, received_qty: 4 }]),
    ).toBe(PURCHASE_FULFILLMENT_STATUS.PARTIAL);
    expect(
      resolvePurchaseStatus([
        { ordered_qty: 10, received_qty: 10 },
        { ordered_qty: 2, received_qty: 2 },
      ]),
    ).toBe(PURCHASE_FULFILLMENT_STATUS.COMPLETED);
    expect(
      resolvePurchaseStatus([{ ordered_qty: 10, received_qty: 12 }]),
    ).toBe(PURCHASE_FULFILLMENT_STATUS.COMPLETED);
  });
});

describe("Goods Receipt & FIFO Batch Allocation", () => {
  it("menolak penerimaan barang jika received_qty melebihi sisa qty PO", () => {
    expect(getRemainingQty(10, 7).toString()).toBe("3");
    expect(validateReceivedQty(10, 7, 3)).toBeNull();
    expect(validateReceivedQty(10, 7, 4)).toContain("melebihi sisa pesanan");
    expect(validateReceivedQty(10, 7, 0)).toContain("lebih dari 0");
  });

  it("allocateFifoBatches mengurutkan batch terlama, memotong lintas batch, dan menghitung HPP", () => {
    const batches: FifoBatch[] = [
      {
        id: "batch-c",
        received_at: "2026-03-01T00:00:00.000Z",
        remaining_qty: 5,
        unit_cost: BigInt(17000),
      },
      {
        id: "batch-a",
        received_at: "2026-01-01T00:00:00.000Z",
        remaining_qty: 2,
        unit_cost: BigInt(10000),
      },
      {
        id: "batch-b",
        received_at: "2026-02-01T00:00:00.000Z",
        remaining_qty: 4,
        unit_cost: BigInt(12000),
      },
    ];

    const result = allocateFifoBatches(batches, 5);

    expect(result.allocations.map((allocation) => allocation.batch_id)).toEqual([
      "batch-a",
      "batch-b",
    ]);
    expect(
      result.allocations.map((allocation) =>
        allocation.allocated_qty.toString(),
      ),
    ).toEqual(["2", "3"]);
    expect(result.allocations.map((allocation) => allocation.subtotal_hpp)).toEqual([
      BigInt(20000),
      BigInt(36000),
    ]);
    expect(result.total_hpp).toBe(BigInt(56000));
    expect(result.remaining_qty.toString()).toBe("0");
    expect(batches[1].remaining_qty).toBe(2);

    const tied = allocateFifoBatches(
      [
        {
          id: "batch-b",
          received_at: "2026-01-01T00:00:00.000Z",
          remaining_qty: 1,
          unit_cost: 1000,
        },
        {
          id: "batch-a",
          received_at: "2026-01-01T00:00:00.000Z",
          remaining_qty: 1,
          unit_cost: 900,
        },
      ],
      2,
    );
    expect(tied.allocations.map((allocation) => allocation.batch_id)).toEqual([
      "batch-a",
      "batch-b",
    ]);
    expect(tied.total_hpp).toBe(BigInt(1900));
  });

  it("allocateFifoBatches melempar error jika stok batch kurang", () => {
    const batches: FifoBatch[] = [
      {
        id: "batch-a",
        received_at: "2026-01-01T00:00:00.000Z",
        remaining_qty: 2,
        unit_cost: BigInt(10000),
      },
      {
        id: "batch-b",
        received_at: "2026-02-01T00:00:00.000Z",
        remaining_qty: 4,
        unit_cost: BigInt(12000),
      },
    ];

    expect(() => allocateFifoBatches(batches, 7)).toThrow(/tidak mencukupi/);
    expect(() => allocateFifoBatches(batches, -1)).toThrow(/negatif/);
    expect(allocateFifoBatches(batches, 0).allocations).toEqual([]);
  });
});

describe("Supplier Payment", () => {
  it("menolak pembayaran jika nominal <= 0 atau melebihi sisa tagihan PO", () => {
    const purchase = {
      paid_amount: BigInt(0),
      remaining_amount: BigInt(100000),
    };

    expect(validateSupplierPayment(purchase, BigInt(0))).toContain(
      "lebih dari 0",
    );
    expect(validateSupplierPayment(purchase, BigInt(-5000))).toContain(
      "lebih dari 0",
    );
    expect(validateSupplierPayment(purchase, BigInt(100001))).toContain(
      "melebihi sisa tagihan",
    );
    expect(
      validateSupplierPayment(
        { ...purchase, remaining_amount: BigInt(0) },
        BigInt(1000),
      ),
    ).toContain("sudah lunas");
    expect(validateSupplierPayment(purchase, BigInt(50000))).toBeNull();
    expect(() =>
      resolveSupplierPayment(purchase, BigInt(100001)),
    ).toThrow(/melebihi sisa tagihan/);
  });

  it("mengubah status pembayaran (UNPAID -> PARTIAL -> PAID) sesuai total terbayar", () => {
    const first = resolveSupplierPayment(
      {
        paid_amount: BigInt(0),
        remaining_amount: BigInt(100000),
      },
      BigInt(40000),
    );

    expect(first.payment_status).toBe(SUPPLIER_PAYMENT_STATUS.PARTIAL);
    expect(first.paid_amount).toBe(BigInt(40000));
    expect(first.remaining_amount).toBe(BigInt(60000));

    const second = resolveSupplierPayment(first, BigInt(60000));

    expect(second.payment_status).toBe(SUPPLIER_PAYMENT_STATUS.PAID);
    expect(second.paid_amount).toBe(BigInt(100000));
    expect(second.remaining_amount).toBe(BigInt(0));
    expect(SUPPLIER_PAYMENT_STATUS.UNPAID).toBe("Belum_dibayar");
  });
});

describe("Packaging Purchase & Weighted Average Cost", () => {
  it("mengonversi satuan beli ke satuan pakai (purchase_qty * conversion_factor)", () => {
    const usageQty = convertPurchaseToUsageQty(2, 12);

    expect(usageQty.toString()).toBe("24");
    expect(
      calculateItemSubtotal({ ordered_qty: 2, unit_price: BigInt(120000) }),
    ).toBe(BigInt(240000));
    expect(() => convertPurchaseToUsageQty(0, 12)).toThrow();
    expect(() => convertPurchaseToUsageQty(2, 0)).toThrow();
  });

  it("menghitung ulang average_unit_cost saat stok awal 0 maupun stok awal > 0", () => {
    const usageQty = convertPurchaseToUsageQty(2, 12);

    const fromEmptyStock = calculateWeightedAverageUnitCost({
      currentStock: 0,
      currentAverageCost: 0,
      purchaseSubtotal: BigInt(240000),
      usageQty,
    });
    expect(fromEmptyStock.toString()).toBe("10000");

    const fromExistingStock = calculateWeightedAverageUnitCost({
      currentStock: 10,
      currentAverageCost: 9000,
      purchaseSubtotal: BigInt(240000),
      usageQty,
    });
    expect(fromExistingStock.toString()).toBe("9705.8824");
  });
});
