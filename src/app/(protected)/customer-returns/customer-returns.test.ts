import { ReturnCondition } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateCustomerReturnRefund,
  planCustomerReturnRestorations,
  validateCustomerReturnItems,
} from "./customer-return-rules";

const ALLOCATIONS = [
  {
    id: "alloc-a",
    sale_item_id: "item-1",
    batch_id: "batch-a",
    received_at: "2026-01-01T00:00:00.000Z",
    allocated_qty: 2,
    reversed_qty: 0,
    batch_unit_cost: BigInt(10000),
  },
  {
    id: "alloc-b",
    sale_item_id: "item-1",
    batch_id: "batch-b",
    received_at: "2026-02-01T00:00:00.000Z",
    allocated_qty: 3,
    reversed_qty: 1,
    batch_unit_cost: BigInt(12000),
  },
];

describe("Validasi Retur Pelanggan", () => {
  it("menerima retur dalam batas qty terjual dikurangi retur sebelumnya", () => {
    expect(
      validateCustomerReturnItems(
        [
          {
            sale_item_id: "item-1",
            variant_id: "v1",
            qty: 4,
            condition: ReturnCondition.Layak_jual,
          },
        ],
        ALLOCATIONS,
      ),
    ).toBeNull();
  });

  it("menolak qty berlebih, duplikat, qty nol, dan HPP negatif tanpa referensi", () => {
    const base = {
      sale_item_id: "item-1",
      variant_id: "v1",
      qty: 5,
      condition: ReturnCondition.Layak_jual,
    };

    expect(
      validateCustomerReturnItems([base], ALLOCATIONS),
    ).toContain("melebihi");
    expect(
      validateCustomerReturnItems([{ ...base, qty: 1 }, { ...base, qty: 1 }], ALLOCATIONS),
    ).toContain("duplikat");
    expect(
      validateCustomerReturnItems(
        [{ ...base, qty: 0 }],
        ALLOCATIONS,
      ),
    ).toContain("lebih dari 0");
    expect(
      validateCustomerReturnItems(
        [
          {
            variant_id: "v1",
            qty: 1,
            condition: ReturnCondition.Layak_jual,
            unit_cost: BigInt(-1),
          },
        ],
      ),
    ).toContain("tidak boleh negatif");
  });
});

describe("Rencana Pemulihan Retur Pelanggan", () => {
  it("memulihkan batch secara LIFO untuk barang layak jual", () => {
    const plan = planCustomerReturnRestorations(
      [
        {
          sale_item_id: "item-1",
          variant_id: "v1",
          qty: 4,
          condition: ReturnCondition.Layak_jual,
        },
      ],
      ALLOCATIONS,
    );

    expect(plan[0]?.batch_restorations.map((row) => row.batch_id)).toEqual([
      "batch-b",
      "batch-a",
    ]);
    expect(plan[0]?.batch_restorations[0]?.qty.toString()).toBe("2");
    expect(plan[0]?.batch_restorations[1]?.qty.toString()).toBe("2");
    expect(plan[0]?.restored_hpp).toBe(BigInt(44000));
    expect(plan[0]?.damaged_qty.toString()).toBe("0");
  });

  it("tidak memulihkan stok jual untuk barang rusak", () => {
    const plan = planCustomerReturnRestorations(
      [
        {
          sale_item_id: "item-1",
          variant_id: "v1",
          qty: 2,
          condition: ReturnCondition.Rusak,
        },
      ],
      ALLOCATIONS,
    );

    expect(plan[0]?.batch_restorations).toHaveLength(0);
    expect(plan[0]?.restored_hpp).toBe(BigInt(0));
    expect(plan[0]?.damaged_qty.toString()).toBe("2");
  });
});

describe("Perhitungan Dana Retur Pelanggan", () => {
  it("menghitung refur proporsional setelah diskon transaksi", () => {
    const refund = calculateCustomerReturnRefund(
      [{ sale_item_id: "item-1", qty: 2 }],
      {
        sale_discount_amount: BigInt(10000),
        items: [
          {
            sale_item_id: "item-1",
            qty: 5,
            subtotal_amount: BigInt(100000),
          },
          {
            sale_item_id: "item-2",
            qty: 1,
            subtotal_amount: BigInt(100000),
          },
        ],
      },
    );

    expect(refund).toBe(BigInt(38000));
  });
});
