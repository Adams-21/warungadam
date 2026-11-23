export const PURCHASE_STATUSES = [
  "Draf",
  "Dikonfirmasi",
  "Diterima_sebagian",
  "Diterima_seluruhnya",
  "Dibatalkan",
] as const;

export type PurchaseStatusValue = (typeof PURCHASE_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "Belum_dibayar",
  "Sebagian",
  "Lunas",
] as const;

export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_TYPES = ["TUNAI", "TEMPO"] as const;

export type PaymentTypeValue = (typeof PAYMENT_TYPES)[number];

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatusValue, string> = {
  Draf: "Draf",
  Dikonfirmasi: "Dikonfirmasi",
  Diterima_sebagian: "Diterima sebagian",
  Diterima_seluruhnya: "Diterima seluruhnya",
  Dibatalkan: "Dibatalkan",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, string> = {
  Belum_dibayar: "Belum dibayar",
  Sebagian: "Sebagian",
  Lunas: "Lunas",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentTypeValue, string> = {
  TUNAI: "Tunai",
  TEMPO: "Tempo",
};

export function purchaseStatusLabel(value: string): string {
  return PURCHASE_STATUS_LABELS[value as PurchaseStatusValue] ?? value;
}

export function paymentStatusLabel(value: string): string {
  return PAYMENT_STATUS_LABELS[value as PaymentStatusValue] ?? value;
}

export function paymentTypeLabel(value: string): string {
  return PAYMENT_TYPE_LABELS[value as PaymentTypeValue] ?? value;
}

export type SupplierOptionView = {
  id: string;
  name: string;
};

export type VariantOptionView = {
  id: string;
  label: string;
  unit_name: string;
};

export type PurchaseListItemView = {
  id: string;
  purchase_number: string;
  supplier_name: string;
  purchase_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
  item_count: number;
};

export type PurchaseItemView = {
  id: string;
  variant_label: string;
  unit_name: string;
  ordered_qty: number;
  received_qty: number;
  remaining_qty: number;
  unit_price: number;
  subtotal: number;
};

export type GoodsReceiptView = {
  id: string;
  receipt_number: string;
  received_at: string;
  notes: string;
  items: Array<{
    variant_label: string;
    qty: number;
    unit_name: string;
  }>;
};

export type SupplierPaymentView = {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  is_void: boolean;
};

export type PurchaseDetailView = {
  id: string;
  purchase_number: string;
  supplier_name: string;
  purchase_date: string;
  payment_type: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  payment_status: string;
  notes: string;
  items: PurchaseItemView[];
  goods_receipts: GoodsReceiptView[];
  supplier_payments: SupplierPaymentView[];
};

export type PackagingMaterialOptionView = {
  id: string;
  name: string;
  purchase_unit_name: string;
  usage_unit_name: string;
  conversion_factor: number;
  stock_qty: number;
  average_unit_cost: number;
};

export type PackagingPurchaseView = {
  id: string;
  purchase_number: string;
  purchase_date: string;
  total_amount: number;
  notes: string;
  items: Array<{
    material_name: string;
    purchase_qty: number;
    purchase_unit_name: string;
    converted_usage_qty: number;
    usage_unit_name: string;
    subtotal: number;
  }>;
};
