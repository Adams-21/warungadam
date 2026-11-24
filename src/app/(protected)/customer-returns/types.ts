import type { ReturnClaimStatus, ReturnCondition, ReturnFundStatus } from "@prisma/client";

export type CustomerReturnVariantView = {
  id: string;
  label: string;
  latest_unit_cost: number;
};

export type CustomerReturnSaleItemView = {
  id: string;
  variant_id: string;
  variant_label: string;
  sold_qty: number;
  available_qty: number;
  unit_selling_price: number;
  subtotal_amount: number;
  unit_cost: number;
};

export type CustomerReturnSaleView = {
  id: string;
  transaction_number: string;
  transaction_date: string;
  total_amount: number;
  discount_amount: number;
  items: CustomerReturnSaleItemView[];
};

export type CustomerReturnListItemView = {
  id: string;
  return_number: string;
  original_sale_number: string | null;
  return_date: string;
  reason: string;
  claim_status: ReturnClaimStatus;
  fund_status: ReturnFundStatus;
  refund_amount: number;
  total_items: number;
};

export type CustomerReturnDetailItemView = {
  id: string;
  variant_label: string;
  sale_item_id: string | null;
  sale_item_label: string | null;
  qty: number;
  condition: ReturnCondition;
  restored_hpp_amount: number;
};

export type CustomerReturnStatusHistoryView = {
  id: string;
  status_group: string;
  old_status: string;
  new_status: string;
  notes: string | null;
  created_at: string;
  created_by_name: string;
};

export type CustomerReturnDetailView = CustomerReturnListItemView & {
  items: CustomerReturnDetailItemView[];
  status_histories: CustomerReturnStatusHistoryView[];
};
