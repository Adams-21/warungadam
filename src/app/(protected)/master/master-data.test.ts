import { describe, expect, it } from "vitest";
import {
  assertCanDeleteMasterData,
  assertValidMasterDataInput,
  canDeleteMasterData,
  getMasterDataDeleteError,
  isPositiveConversionFactor,
  isPositivePrice,
  validateMasterDataInput,
  type MasterDataEntity,
  type RelationCounts,
} from "./master-data-rules";
import { nextChannelActiveState } from "./settings/sales-channel-settings-helpers";

const RELATED_CASES: Array<{
  entity: MasterDataEntity;
  counts: RelationCounts;
}> = [
  { entity: "PRODUCT", counts: { variants: 2, sale_items: 1 } },
  { entity: "VARIANT", counts: { purchase_items: 1, stock_batches: 3 } },
  {
    entity: "PACKAGING_MATERIAL",
    counts: { packaging_purchase_items: 2, packaging_movements: 1 },
  },
  { entity: "SUPPLIER", counts: { purchases: 1, variant_suppliers: 1 } },
];

const CLEAN_COUNTS: RelationCounts = {
  variants: 0,
  sale_items: 0,
  purchase_items: 0,
  goods_receipt_items: 0,
  stock_batches: 0,
  packaging_purchase_items: 0,
  package_size_items: 0,
  packaging_movements: 0,
  sale_packaging_usages: 0,
  purchases: 0,
  variant_suppliers: 0,
  products: 0,
  sales: 0,
};

describe("Master Data Validation & Safe Delete", () => {
  it("menolak penghapusan Produk, Varian, Material Kemasan, atau Supplier jika memiliki relasi transaksi > 0", () => {
    for (const item of RELATED_CASES) {
      expect(canDeleteMasterData(item.entity, item.counts)).toBe(false);
      expect(getMasterDataDeleteError(item.entity, item.counts)).toContain(
        "relasi transaksi",
      );
      expect(() => assertCanDeleteMasterData(item.entity, item.counts)).toThrow(
        /tidak dapat dihapus/,
      );
    }
  });

  it("mengizinkan penghapusan jika seluruh relasi transaksi = 0", () => {
    for (const item of RELATED_CASES) {
      expect(canDeleteMasterData(item.entity, CLEAN_COUNTS)).toBe(true);
      expect(getMasterDataDeleteError(item.entity, CLEAN_COUNTS)).toBeNull();
      expect(() =>
        assertCanDeleteMasterData(item.entity, CLEAN_COUNTS),
      ).not.toThrow();
    }
  });

  it("memvalidasi harga jual/beli dan faktor konversi kemasan tidak boleh <= 0", () => {
    expect(isPositivePrice(BigInt(15000))).toBe(true);
    expect(isPositivePrice("2500")).toBe(true);
    expect(isPositivePrice(0)).toBe(false);
    expect(isPositivePrice(BigInt(0))).toBe(false);
    expect(isPositivePrice(-1)).toBe(false);
    expect(isPositivePrice("-500")).toBe(false);

    expect(isPositiveConversionFactor(12)).toBe(true);
    expect(isPositiveConversionFactor(0)).toBe(false);
    expect(isPositiveConversionFactor(-0.5)).toBe(false);

    expect(validateMasterDataInput({ selling_price: 0 })).toContain(
      "Harga jual",
    );
    expect(validateMasterDataInput({ purchase_price: BigInt(0) })).toContain(
      "Harga beli",
    );
    expect(validateMasterDataInput({ conversion_factor: 0 })).toContain(
      "Faktor konversi",
    );
    expect(
      validateMasterDataInput({
        selling_price: 15000,
        purchase_price: BigInt(9000),
        conversion_factor: 12,
      }),
    ).toBeNull();
    expect(() =>
      assertValidMasterDataInput({ selling_price: "0" }),
    ).toThrow(/Harga jual/);
  });
});

describe("Status Kanal Penjualan", () => {
  it("mengaktifkan kanal yang nonaktif", () => {
    expect(nextChannelActiveState(false)).toBe(true);
  });

  it("menonaktifkan kanal yang aktif", () => {
    expect(nextChannelActiveState(true)).toBe(false);
  });
});
