import { describe, expect, it } from "vitest";
import {
  addPosVariant,
  capPosQty,
  filterPosVariants,
  getPosCartQty,
  resolvePosVariantPrice,
  type PosCartRow,
  type PosVariant,
} from "./pos-helpers";

const VARIANTS: PosVariant[] = [
  {
    id: "v1",
    label: "Kopi Susu — Original",
    unit_name: "pcs",
    stock_qty: 3,
    default_selling_price: 18000,
    channel_prices: { ch1: 20000 },
  },
  {
    id: "v2",
    label: "Teh Tarik — Hangat",
    unit_name: "gelas",
    stock_qty: 0,
    default_selling_price: 12000,
    channel_prices: {},
  },
];

const EMPTY_ROWS: PosCartRow[] = [];

describe("Katalog POS Layar Sentuh", () => {
  it("memfilter varian berdasarkan nama produk/varian secara instan", () => {
    expect(filterPosVariants(VARIANTS, "").map((item) => item.id)).toEqual([
      "v1",
      "v2",
    ]);
    expect(filterPosVariants(VARIANTS, "kopi").map((item) => item.id)).toEqual([
      "v1",
    ]);
    expect(
      filterPosVariants(VARIANTS, "  ORIGINAL  ").map((item) => item.id),
    ).toEqual(["v1"]);
    expect(filterPosVariants(VARIANTS, "tidak ada")).toEqual([]);
  });

  it("memakai harga kanal bila tersedia dan fallback ke harga default", () => {
    expect(resolvePosVariantPrice(VARIANTS[0], "ch1")).toBe("20000");
    expect(resolvePosVariantPrice(VARIANTS[0], "offline")).toBe("18000");
    expect(resolvePosVariantPrice(VARIANTS[1], "ch1")).toBe("12000");
  });
});

describe("Keranjang POS Layar Sentuh", () => {
  it("membatasi jumlah qty sesuai sisa stok", () => {
    expect(capPosQty("2", 3)).toBe("2");
    expect(capPosQty(5, 3)).toBe("3");
    expect(capPosQty(1, 0.5)).toBe("0.5");
    expect(capPosQty("-2", 3)).toBe("0");
    expect(capPosQty("abc", 3)).toBe("0");
  });

  it("menambah varian baru ke keranjang dengan harga kanal", () => {
    const result = addPosVariant(EMPTY_ROWS, VARIANTS[0], "ch1", 1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      key: 1,
      variant_id: "v1",
      qty: "1",
      unit_selling_price: "20000",
      item_discount: "0",
    });
    expect(result.nextKey).toBe(2);
  });

  it("menambah +1 pada varian yang sudah ada tanpa melewati stok", () => {
    const existing: PosCartRow[] = [
      {
        key: 1,
        variant_id: "v1",
        qty: "2",
        unit_selling_price: "20000",
        item_discount: "0",
      },
    ];
    const incremented = addPosVariant(existing, VARIANTS[0], "ch1", 9);
    expect(incremented.rows[0].qty).toBe("3");
    expect(incremented.nextKey).toBe(9);

    const atLimit: PosCartRow[] = [{ ...existing[0], qty: "3" }];
    expect(addPosVariant(atLimit, VARIANTS[0], "ch1", 9)).toEqual({
      rows: atLimit,
      nextKey: 9,
    });
  });

  it("tidak menambah varian habis dan menjumlahkan qty duplikat", () => {
    expect(addPosVariant(EMPTY_ROWS, VARIANTS[1], "ch1", 1)).toEqual({
      rows: EMPTY_ROWS,
      nextKey: 1,
    });
    expect(
      getPosCartQty(
        [
          {
            key: 1,
            variant_id: "v1",
            qty: "1",
            unit_selling_price: "20000",
            item_discount: "0",
          },
          {
            key: 2,
            variant_id: "v1",
            qty: "2",
            unit_selling_price: "20000",
            item_discount: "0",
          },
        ],
        "v1",
      ),
    ).toBe(3);
  });
});
