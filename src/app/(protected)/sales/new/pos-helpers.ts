import type { SaleVariantOptionView } from "../types";

export type PosCartRow = {
  key: number;
  variant_id: string;
  qty: string;
  unit_selling_price: string;
  item_discount: string;
};

export type PosVariant = Pick<
  SaleVariantOptionView,
  | "id"
  | "label"
  | "unit_name"
  | "stock_qty"
  | "default_selling_price"
  | "channel_prices"
>;

export function filterPosVariants<T extends PosVariant>(
  variants: T[],
  query: string,
): T[] {
  const needle = query.trim().toLocaleLowerCase("id-ID");
  if (!needle) return variants;

  return variants.filter((variant) =>
    `${variant.label} ${variant.unit_name}`
      .toLocaleLowerCase("id-ID")
      .includes(needle),
  );
}

export function resolvePosVariantPrice(
  variant: PosVariant,
  channelId: string,
): string {
  const price =
    variant.channel_prices[channelId] ?? variant.default_selling_price;
  return String(Number.isFinite(price) ? price : 0);
}

export function capPosQty(value: string | number, stockQty: number): string {
  const parsed = Number(value);
  const stock = Math.max(0, Number(stockQty) || 0);
  if (!Number.isFinite(parsed) || parsed <= 0 || stock <= 0) return "0";
  return String(Math.min(parsed, stock));
}

export function getPosCartQty(
  rows: PosCartRow[],
  variantId: string,
): number {
  return rows.reduce(
    (sum, row) =>
      row.variant_id === variantId ? sum + (Number(row.qty) || 0) : sum,
    0,
  );
}

export function addPosVariant(
  rows: PosCartRow[],
  variant: PosVariant,
  channelId: string,
  nextKey: number,
): { rows: PosCartRow[]; nextKey: number } {
  const stock = Math.max(0, Number(variant.stock_qty) || 0);
  if (stock <= 0) return { rows, nextKey };

  const currentQty = getPosCartQty(rows, variant.id);
  if (currentQty >= stock) return { rows, nextKey };

  const index = rows.findIndex((row) => row.variant_id === variant.id);
  if (index >= 0) {
    return {
      rows: rows.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, qty: capPosQty(currentQty + 1, stock) }
          : row,
      ),
      nextKey,
    };
  }

  return {
    rows: [
      ...rows,
      {
        key: nextKey,
        variant_id: variant.id,
        qty: capPosQty(1, stock),
        unit_selling_price: resolvePosVariantPrice(variant, channelId),
        item_discount: "0",
      },
    ],
    nextKey: nextKey + 1,
  };
}
