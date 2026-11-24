export const SALE_ORDER_STATUSES = [
  "Baru",
  "Diproses",
  "Selesai",
  "Dibatalkan",
] as const;

export const SALE_PAYMENT_STATUSES = [
  "Belum_dibayar",
  "Dibayar",
  "Dikembalikan",
] as const;

export const SALE_SETTLEMENT_STATUSES = [
  "Belum_cair",
  "Sebagian_cair",
  "Sudah_cair",
  "Tidak_dicairkan",
] as const;

export type SaleOrderStatusValue = (typeof SALE_ORDER_STATUSES)[number];
export type SalePaymentStatusValue = (typeof SALE_PAYMENT_STATUSES)[number];
export type SaleSettlementStatusValue =
  (typeof SALE_SETTLEMENT_STATUSES)[number];

const ORDER_STATUS_LABELS: Record<SaleOrderStatusValue, string> = {
  Baru: "Baru",
  Diproses: "Diproses",
  Selesai: "Selesai",
  Dibatalkan: "Dibatalkan",
};

const PAYMENT_STATUS_LABELS: Record<SalePaymentStatusValue, string> = {
  Belum_dibayar: "Belum dibayar",
  Dibayar: "Dibayar",
  Dikembalikan: "Dikembalikan",
};

const SETTLEMENT_STATUS_LABELS: Record<SaleSettlementStatusValue, string> = {
  Belum_cair: "Belum cair",
  Sebagian_cair: "Sebagian cair",
  Sudah_cair: "Sudah cair",
  Tidak_dicairkan: "Tidak dicairkan",
};

export function saleOrderStatusLabel(value: string): string {
  return ORDER_STATUS_LABELS[value as SaleOrderStatusValue] ?? value;
}

export function salePaymentStatusLabel(value: string): string {
  return PAYMENT_STATUS_LABELS[value as SalePaymentStatusValue] ?? value;
}

export function saleSettlementStatusLabel(value: string): string {
  return SETTLEMENT_STATUS_LABELS[value as SaleSettlementStatusValue] ?? value;
}

export type SaleChannelOptionView = {
  id: string;
  name: string;
  is_marketplace: boolean;
};

export type SaleVariantOptionView = {
  id: string;
  label: string;
  unit_name: string;
  stock_qty: number;
  default_selling_price: number;
  cost_hint: number;
  channel_prices: Record<string, number>;
};

export type SalePackageSizeView = {
  id: string;
  name: string;
  items: Array<{
    packaging_material_id: string;
    material_name: string;
    usage_unit_name: string;
    default_usage_qty: number;
    stock_qty: number;
    average_unit_cost: number;
  }>;
};

export type SalePackagingMaterialView = {
  id: string;
  name: string;
  usage_unit_name: string;
  stock_qty: number;
  average_unit_cost: number;
};

export type SaleListItemView = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  channel_name: string;
  external_order_number: string;
  package_size_name: string;
  total_amount: number;
  product_cogs: number;
  packaging_cogs: number;
  total_cogs: number;
  gross_profit: number;
  order_status: string;
  payment_status: string;
  settlement_status: string;
  item_count: number;
};

export type SaleBatchAllocationView = {
  batch_id: string;
  allocated_qty: number;
  reversed_qty: number;
  batch_unit_cost: number;
  received_at: string;
  subtotal_hpp: number;
};

export type SaleItemView = {
  id: string;
  variant_label: string;
  unit_name: string;
  qty: number;
  unit_selling_price: number;
  discount_amount: number;
  subtotal_amount: number;
  total_hpp_fifo: number;
  allocations: SaleBatchAllocationView[];
};

export type SalePackagingUsageView = {
  id: string;
  material_name: string;
  usage_unit_name: string;
  standard_usage_qty: number;
  actual_usage_qty: number;
  unit_cost_snapshot: number;
  calculated_hpp: number;
  adjusted_hpp: number | null;
  final_hpp: number;
};

export type SaleStatusHistoryView = {
  id: string;
  status_group: string;
  new_status: string;
  reason: string;
  created_at: string;
};

export type SaleDetailView = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  channel_name: string;
  external_order_number: string;
  package_size_name: string;
  created_by: string;
  subtotal_amount: number;
  discount_amount: number;
  additional_fee_amount: number;
  total_amount: number;
  product_cogs: number;
  packaging_cogs: number;
  total_cogs: number;
  gross_profit: number;
  admin_fee_estimate_rate: number;
  admin_fee_estimate_amount: number;
  order_status: string;
  payment_status: string;
  settlement_status: string;
  is_stock_deducted: boolean;
  items: SaleItemView[];
  packaging_usages: SalePackagingUsageView[];
  status_histories: SaleStatusHistoryView[];
};
