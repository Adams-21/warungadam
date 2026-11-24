export const MASTER_DATA_RELATION_KEYS = {
  PRODUCT: ["variants", "sale_items"],
  VARIANT: [
    "purchase_items",
    "goods_receipt_items",
    "stock_batches",
    "sale_items",
  ],
  PACKAGING_MATERIAL: [
    "packaging_purchase_items",
    "package_size_items",
    "packaging_movements",
    "sale_packaging_usages",
  ],
  SUPPLIER: ["purchases", "variant_suppliers"],
  CATEGORY: ["products"],
  PACKAGE_SIZE: ["sales"],
} as const;

export type MasterDataEntity = keyof typeof MASTER_DATA_RELATION_KEYS;

export type RelationCounts = Readonly<Record<string, number | undefined>>;

export const MASTER_DATA_LABELS: Record<MasterDataEntity, string> = {
  PRODUCT: "Produk",
  VARIANT: "Varian",
  PACKAGING_MATERIAL: "Material kemasan",
  SUPPLIER: "Supplier",
  CATEGORY: "Kategori",
  PACKAGE_SIZE: "Ukuran paket",
};

export function getBlockingRelations(
  entity: MasterDataEntity,
  counts: RelationCounts,
): string[] {
  return MASTER_DATA_RELATION_KEYS[entity].filter(
    (key) => (counts[key] ?? 0) > 0,
  );
}

export function canDeleteMasterData(
  entity: MasterDataEntity,
  counts: RelationCounts,
): boolean {
  return getBlockingRelations(entity, counts).length === 0;
}

export function getMasterDataDeleteError(
  entity: MasterDataEntity,
  counts: RelationCounts,
): string | null {
  const blocking = getBlockingRelations(entity, counts);
  if (blocking.length === 0) return null;

  return `${MASTER_DATA_LABELS[entity]} masih memiliki relasi transaksi (${blocking.join(", ")}) dan tidak dapat dihapus.`;
}

export function assertCanDeleteMasterData(
  entity: MasterDataEntity,
  counts: RelationCounts,
): void {
  const error = getMasterDataDeleteError(entity, counts);
  if (error) throw new Error(error);
}

export type PositiveNumberInput = number | bigint | string;

export function isPositivePrice(value: PositiveNumberInput): boolean {
  if (typeof value === "bigint") return value > BigInt(0);
  if (typeof value === "number") return Number.isFinite(value) && value > 0;

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return false;
  return BigInt(trimmed) > BigInt(0);
}

export function isPositiveConversionFactor(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export type MasterDataInput = {
  selling_price?: PositiveNumberInput;
  purchase_price?: PositiveNumberInput;
  conversion_factor?: number;
};

export function validateMasterDataInput(input: MasterDataInput): string | null {
  if (
    input.selling_price !== undefined &&
    !isPositivePrice(input.selling_price)
  ) {
    return "Harga jual harus lebih dari 0";
  }
  if (
    input.purchase_price !== undefined &&
    !isPositivePrice(input.purchase_price)
  ) {
    return "Harga beli harus lebih dari 0";
  }
  if (
    input.conversion_factor !== undefined &&
    !isPositiveConversionFactor(input.conversion_factor)
  ) {
    return "Faktor konversi kemasan harus lebih dari 0";
  }
  return null;
}

export function assertValidMasterDataInput(input: MasterDataInput): void {
  const error = validateMasterDataInput(input);
  if (error) throw new Error(error);
}
