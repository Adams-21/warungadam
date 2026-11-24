export type ExpenseCategoryView = {
  id: string;
  name: string;
  is_active: boolean;
};

export type ExpenseView = {
  id: string;
  expense_date: string;
  amount: number;
  description: string;
  is_void: boolean;
  void_reason: string | null;
  voided_by: string | null;
  category_id: string;
  category_name: string;
  created_by: string;
  created_at: string;
  can_manage: boolean;
};

export type ExpenseFilterValues = {
  q: string;
  category_id: string;
  date_from: string;
  date_to: string;
  include_void: boolean;
};

export type ExpenseSummaryView = {
  totalRevenue: number;
  productCogs: number;
  packagingCogs: number;
  totalCogs: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  netProfit: number;
};

export type ExpenseCategoryTotalView = {
  category_id: string;
  category_name: string;
  count: number;
  total: number;
};
