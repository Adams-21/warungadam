import { Prisma, SupplierReturnResolution } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateSupplierReturnAmount,
  firstValue,
  isBlankSupplierReturnAmount,
  planSupplierReturnItems,
  resolveSupplierReturnAmount,
  validateSupplierReturnAmount,
  validateSupplierReturnItems,
  type SupplierReturnItemInput,
  type SupplierReturnReceiptContext,
} from "./supplier-return-rules";

const decimal = (value: string) => new Prisma.Decimal(value);

const CONTEXTS: SupplierReturnReceiptContext[] = [
  {
    goods_receipt_item_id: "gri-1",
    batch_id: "batch-1",
    variant_id: "variant-1",
    received_qty: decimal("10"),
    prior_returned_qty: decimal("3"),
    batch_remaining_qty: decimal("6"),
    unit_price: BigInt(10000),
  },
];

const ITEMS: SupplierReturnItemInput[] = [
  {
    goods_receipt_item_id: "gri-1",
    batch_id: "batch-1",
    variant_id: "variant-1",
    qty: decimal("4"),
    unit_price: BigInt(10000),
  },
];

describe("Validasi Retur Supplier", () => {
  it("menerima retur dalam batas barang belum diretur dan sisa batch", () => {
    expect(validateSupplierReturnItems(ITEMS, CONTEXTS)).toBeNull();
  });

  it("menolak retur melebihi barang belum diretur", () => {
    const result = validateSupplierReturnItems(
      [{ ...ITEMS[0]!, qty: decimal("8") }],
      CONTEXTS,
    );
    expect(result).toContain("belum diretur");
  });

  it("menolak retur melebihi sisa batch dan barang duplikat", () => {
    expect(
      validateSupplierReturnItems(
        [{ ...ITEMS[0]!, qty: decimal("7") }],
        CONTEXTS,
      ),
    ).toContain("sisa stok batch");
    expect(validateSupplierReturnItems([ITEMS[0]!, ITEMS[0]!], CONTEXTS)).toContain(
      "duplikat",
    );
  });

  it("menolak batch tidak sesuai, qty nol, dan harga negatif", () => {
    expect(
      validateSupplierReturnItems(
        [{ ...ITEMS[0]!, batch_id: "batch-lain" }],
        CONTEXTS,
      ),
    ).toContain("tidak sesuai");
    expect(
      validateSupplierReturnItems(
        [{ ...ITEMS[0]!, qty: decimal("0") }],
        CONTEXTS,
      ),
    ).toContain("lebih dari 0");
    expect(
      validateSupplierReturnItems(
        [{ ...ITEMS[0]!, unit_price: BigInt(-1) }],
        CONTEXTS,
      ),
    ).toContain("negatif");
  });
});

describe("Nilai Retur Supplier", () => {
  it("menghitung nilai otomatis dari subtotal item", () => {
    expect(calculateSupplierReturnAmount(ITEMS)).toBe(BigInt(40000));
    expect(planSupplierReturnItems(ITEMS)[0]?.subtotal).toBe(BigInt(40000));
  });

  it("menolak nominal negatif, melebihi nilai item, dan potongan melebihi tagihan", () => {
    const base = {
      calculated_amount: BigInt(40000),
      remaining_amount: BigInt(30000),
      settlement_date: null,
    };

    expect(
      validateSupplierReturnAmount({
        ...base,
        return_amount: BigInt(-1),
        resolution_type: SupplierReturnResolution.PENGEMBALIAN_UANG,
      }),
    ).toContain("negatif");
    expect(
      validateSupplierReturnAmount({
        ...base,
        return_amount: BigInt(50000),
        resolution_type: SupplierReturnResolution.PENGEMBALIAN_UANG,
      }),
    ).toContain("melebihi nilai");
    expect(
      validateSupplierReturnAmount({
        ...base,
        return_amount: BigInt(35000),
        resolution_type: SupplierReturnResolution.POTONGAN_TAGIHAN,
      }),
    ).toContain("sisa tagihan");
  });

  it("menolak potongan tagihan dengan nominal nol", () => {
    expect(
      validateSupplierReturnAmount({
        calculated_amount: BigInt(40000),
        return_amount: BigInt(0),
        remaining_amount: BigInt(50000),
        resolution_type: SupplierReturnResolution.POTONGAN_TAGIHAN,
        settlement_date: null,
      }),
    ).toContain("lebih dari 0");
    expect(
      validateSupplierReturnAmount({
        calculated_amount: BigInt(40000),
        return_amount: BigInt(0),
        resolution_type: SupplierReturnResolution.BARANG_PENGGANTI,
        remaining_amount: BigInt(50000),
        settlement_date: null,
      }),
    ).toBeNull();
  });

  it("mewajibkan tanggal realisasi untuk pengembalian uang", () => {
    expect(
      validateSupplierReturnAmount({
        calculated_amount: BigInt(40000),
        return_amount: BigInt(40000),
        remaining_amount: BigInt(50000),
        resolution_type: SupplierReturnResolution.PENGEMBALIAN_UANG,
        settlement_date: null,
      }),
    ).toContain("Tanggal realisasi");
    expect(
      validateSupplierReturnAmount({
        calculated_amount: BigInt(40000),
        return_amount: BigInt(40000),
        remaining_amount: BigInt(50000),
        resolution_type: SupplierReturnResolution.BARANG_PENGGANTI,
        settlement_date: null,
      }),
    ).toBeNull();
  });
});

describe("Nominal Retur Supplier dari Form", () => {
  it("menormalkan nilai kosong ke nominal kalkulasi", () => {
    expect(isBlankSupplierReturnAmount("")).toBe(true);
    expect(isBlankSupplierReturnAmount("   ")).toBe(true);
    expect(isBlankSupplierReturnAmount(null)).toBe(true);
    expect(isBlankSupplierReturnAmount("0")).toBe(false);
    expect(resolveSupplierReturnAmount("", BigInt(40000))).toBe(BigInt(40000));
    expect(resolveSupplierReturnAmount(null, BigInt(40000))).toBe(BigInt(40000));
    expect(resolveSupplierReturnAmount("25000", BigInt(40000))).toBe(BigInt(25000));
    expect(resolveSupplierReturnAmount("0", BigInt(40000))).toBe(BigInt(0));
  });

  it("mengambil nilai pertama dari parameter query", () => {
    expect(firstValue(undefined)).toBeUndefined();
    expect(firstValue("RET-1")).toBe("RET-1");
    expect(firstValue(["RET-1", "RET-2"])).toBe("RET-1");
    expect(firstValue([])).toBeUndefined();
  });
});
