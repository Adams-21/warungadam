import {
  aggregateDashboard,
  calculateDashboardSaleCogs,
} from "../dashboard/dashboard-rules";

export type ExpenseProfitSaleRecord = {
  id?: string;
  transaction_number?: string;
  transaction_date: Date | string;
  order_status?: string;
  payment_status?: string;
  settlement_status?: string;
  total_amount: bigint | number | string;
  admin_fee_estimate_amount: bigint | number | string;
  admin_fee_actual_amount?: bigint | number | string | null;
  items: readonly { total_hpp_fifo: bigint | number | string }[];
  packaging_usages: readonly {
    calculated_hpp: bigint | number | string;
    adjusted_hpp?: bigint | number | string | null;
  }[];
};

export type ExpenseProfitRefundRecord = {
  refund_paid_date: Date | string | null;
  refund_amount: bigint | number | string;
  fund_status?: string;
};

export type ExpenseProfitExpenseRecord = {
  expense_date: Date | string;
  amount: bigint | number | string;
  is_void?: boolean;
};

export type ExpenseProfitWriteOffRecord = {
  created_at: Date | string;
  loss_value: bigint | number | string;
};

export type ExpenseProfitInput = {
  from: Date;
  to: Date;
  sales: readonly ExpenseProfitSaleRecord[];
  refunds: readonly ExpenseProfitRefundRecord[];
  expenses: readonly ExpenseProfitExpenseRecord[];
  writeOffs: readonly ExpenseProfitWriteOffRecord[];
};

export type ExpenseProfitReport = {
  totalRevenue: bigint;
  productCogs: bigint;
  packagingCogs: bigint;
  totalCogs: bigint;
  adminFee: bigint;
  refunds: bigint;
  writeOffLoss: bigint;
  grossProfit: bigint;
  totalOperatingExpenses: bigint;
  netProfit: bigint;
};

export function calculateExpenseProfit(
  input: ExpenseProfitInput,
): ExpenseProfitReport {
  const dashboard = aggregateDashboard({
    period: { from: input.from, to: input.to },
    sales: input.sales.map((sale) => {
      const cogs = calculateDashboardSaleCogs(sale);
      return {
        id: sale.id,
        transaction_number: sale.transaction_number,
        transaction_date: sale.transaction_date,
        order_status: sale.order_status,
        payment_status: sale.payment_status,
        settlement_status: sale.settlement_status,
        total_amount: sale.total_amount,
        product_cogs: cogs.product_cogs,
        packaging_cogs: cogs.packaging_cogs,
        admin_fee_estimate_amount: sale.admin_fee_estimate_amount,
        admin_fee_actual_amount: sale.admin_fee_actual_amount,
      };
    }),
    refunds: input.refunds,
    expenses: input.expenses,
    write_offs: input.writeOffs,
  });

  return {
    totalRevenue: dashboard.kpis.total_sales,
    productCogs: dashboard.kpis.product_cogs,
    packagingCogs: dashboard.kpis.packaging_cogs,
    totalCogs: dashboard.kpis.total_cogs,
    adminFee: dashboard.kpis.admin_fee,
    refunds: dashboard.kpis.refunds,
    writeOffLoss: dashboard.kpis.write_off_loss,
    grossProfit: dashboard.kpis.gross_profit,
    totalOperatingExpenses: dashboard.kpis.operating_expenses,
    netProfit: dashboard.kpis.net_profit,
  };
}
