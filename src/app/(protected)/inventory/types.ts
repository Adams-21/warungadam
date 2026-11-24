import type { MovementGroup } from "./inventory-rules";

export type InventoryBatchView = {
  id: string;
  received_at: string;
  source_type: string;
  remaining_qty: number;
  unit_cost: number;
  asset_value: number;
};

export type InventoryProductView = {
  id: string;
  variant_name: string;
  product_name: string;
  unit_name: string;
  stock_qty: number;
  damaged_stock_qty: number;
  min_stock: number | null;
  is_low: boolean;
  batches: InventoryBatchView[];
};

export type InventoryPackagingView = {
  id: string;
  name: string;
  unit_name: string;
  stock_qty: number;
  min_stock: number | null;
  average_unit_cost: number;
  asset_value: number;
  is_low: boolean;
};

export type InventoryMutationView = {
  id: string;
  date: string;
  item_type: "Produk" | "Kemasan";
  item_name: string;
  movement_type: string;
  group: MovementGroup;
  qty_change: number;
  balance_after: number | null;
  reference_number: string;
  notes: string | null;
};

export type InventoryAdjustmentOption = {
  id: string;
  label: string;
  stock_qty: number;
};
