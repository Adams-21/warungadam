import { SALE_PAYMENT_METHODS, type SalePaymentMethodValue } from "./types";

export function resolveSalePaymentStatus(
  input: string,
): "Dibayar" | "Belum_dibayar" {
  return input === "Lunas" ? "Dibayar" : "Belum_dibayar";
}

export function isSalePaymentMethod(
  value: unknown,
): value is SalePaymentMethodValue {
  return (
    typeof value === "string" &&
    SALE_PAYMENT_METHODS.some((method) => method === value)
  );
}

export function salePaymentMethodLabel(
  value: string | null | undefined,
): string {
  return value && value.trim() !== "" ? value : "-";
}

export function salePaymentHistoryReason(method: string): string {
  return `Metode pembayaran: ${method}`;
}

export function saleVoidPaymentHistoryReason(reason: string): string {
  return `Pembatalan transaksi: ${reason}`;
}

export function validateSalePaidStatus(input: {
  order_status: string;
  payment_status: string;
}): string | null {
  if (input.order_status === "Dibatalkan") {
    return "Transaksi sudah dibatalkan.";
  }
  if (input.payment_status === "Dibayar") {
    return "Transaksi sudah lunas.";
  }
  if (input.payment_status !== "Belum_dibayar") {
    return "Status pembayaran tidak valid untuk ditandai lunas.";
  }
  return null;
}

export function validateSaleSettlementStatus(input: {
  order_status: string;
  settlement_status: string;
}): string | null {
  if (input.order_status === "Dibatalkan") {
    return "Transaksi sudah dibatalkan.";
  }
  if (input.settlement_status === "Sudah_cair") {
    return "Dana transaksi sudah dicairkan.";
  }
  if (
    input.settlement_status !== "Belum_cair" &&
    input.settlement_status !== "Sebagian_cair"
  ) {
    return "Status pencairan tidak valid untuk diubah.";
  }
  return null;
}

export function planSaleVoidPaymentVoids(
  payments: Array<{ id: string }>,
  reason: string,
): Array<{ id: string; reason: string }> {
  return payments.map((payment) => ({
    id: payment.id,
    reason: saleVoidPaymentHistoryReason(reason),
  }));
}
