import type { SupplierReturnResolution } from "@prisma/client";

export type SupplierReturnReceiptItemView = {
  id: string;
  batch_id: string;
  variant_id: string;
  label: string;
  received_qty: number;
  prior_returned_qty: number;
  available_qty: number;
  batch_remaining_qty: number;
  unit_price: number;
};

export type SupplierReturnPurchaseView = {
  id: string;
  purchase_number: string;
  supplier_name: string;
  purchase_date: string;
  remaining_amount: number;
  items: SupplierReturnReceiptItemView[];
};

export type SupplierReturnListItemView = {
  id: string;
  return_number: string;
  purchase_number: string;
  supplier_name: string;
  return_date: string;
  resolution_type: SupplierReturnResolution;
  calculated_return_amount: number;
  return_amount: number;
  settlement_date: string | null;
  reason: string;
  total_items: number;
};

export type SupplierReturnDetailItemView = {
  id: string;
  variant_label: string;
  qty: number;
  unit_price: number;
  subtotal: number;
};

export type SupplierReturnDetailView = SupplierReturnListItemView & {
  items: SupplierReturnDetailItemView[];
};
