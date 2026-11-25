import { describe, expect, it } from "vitest";
import { salePaymentStatusLabel, saleStatusHistoryLabel } from "./types";
import {
  isSalePaymentMethod,
  planSaleVoidPaymentVoids,
  resolveSalePaymentStatus,
  salePaymentHistoryReason,
  salePaymentMethodLabel,
  saleVoidPaymentHistoryReason,
  validateSalePaidStatus,
  validateSaleSettlementStatus,
} from "./sales-payment-helpers";

describe("Status dan Metode Pembayaran Penjualan", () => {
  it("memetakan status input ke status database", () => {
    expect(resolveSalePaymentStatus("Lunas")).toBe("Dibayar");
    expect(resolveSalePaymentStatus("Belum_dibayar")).toBe("Belum_dibayar");
    expect(resolveSalePaymentStatus("tidak dikenal")).toBe("Belum_dibayar");
  });

  it("hanya menerima metode pembayaran yang tersedia", () => {
    expect(isSalePaymentMethod("Tunai")).toBe(true);
    expect(isSalePaymentMethod("QRIS")).toBe(true);
    expect(isSalePaymentMethod("Transfer Bank (BCA / BRI / Mandiri)")).toBe(true);
    expect(isSalePaymentMethod("Transfer")).toBe(false);
    expect(isSalePaymentMethod(null)).toBe(false);
  });

  it("menampilkan label metode dan alasan riwayat dengan rapi", () => {
    expect(salePaymentMethodLabel("QRIS")).toBe("QRIS");
    expect(salePaymentMethodLabel(null)).toBe("-");
    expect(salePaymentHistoryReason("QRIS")).toBe("Metode pembayaran: QRIS");
    expect(saleVoidPaymentHistoryReason("salah input")).toBe(
      "Pembatalan transaksi: salah input",
    );
  });
});

describe("Validasi Perubahan Status Pembayaran dan Pencairan", () => {
  it("mengizinkan transaksi belum dibayar ditandai lunas", () => {
    expect(
      validateSalePaidStatus({
        order_status: "Selesai",
        payment_status: "Belum_dibayar",
      }),
    ).toBeNull();
  });

  it("menolak transaksi lunas, dibatalkan, atau status tidak dikenal", () => {
    expect(
      validateSalePaidStatus({
        order_status: "Selesai",
        payment_status: "Dibayar",
      }),
    ).toContain("sudah lunas");
    expect(
      validateSalePaidStatus({
        order_status: "Dibatalkan",
        payment_status: "Belum_dibayar",
      }),
    ).toContain("dibatalkan");
    expect(
      validateSalePaidStatus({
        order_status: "Selesai",
        payment_status: "Dikembalikan",
      }),
    ).toContain("tidak valid");
  });

  it("mengizinkan pencairan dari status belum cair atau sebagian cair", () => {
    expect(
      validateSaleSettlementStatus({
        order_status: "Selesai",
        settlement_status: "Belum_cair",
      }),
    ).toBeNull();
    expect(
      validateSaleSettlementStatus({
        order_status: "Selesai",
        settlement_status: "Sebagian_cair",
      }),
    ).toBeNull();
  });

  it("menolak pencairan ganda dan transaksi dibatalkan", () => {
    expect(
      validateSaleSettlementStatus({
        order_status: "Selesai",
        settlement_status: "Sudah_cair",
      }),
    ).toContain("sudah dicairkan");
    expect(
      validateSaleSettlementStatus({
        order_status: "Dibatalkan",
        settlement_status: "Belum_cair",
      }),
    ).toContain("dibatalkan");
    expect(
      validateSaleSettlementStatus({
        order_status: "Selesai",
        settlement_status: "Tidak_dicairkan",
      }),
    ).toContain("tidak valid");
  });
});

describe("Label Riwayat Status Penjualan", () => {
  it("merapikan label enum snake_case", () => {
    expect(salePaymentStatusLabel("Belum_dibayar")).toBe("Belum dibayar");
    expect(salePaymentStatusLabel("Dibayar")).toBe("Lunas");
    expect(saleStatusHistoryLabel("SETTLEMENT", "Tidak_dicairkan")).toBe(
      "Tidak dicairkan",
    );
    expect(saleStatusHistoryLabel("PAYMENT", "Belum_dibayar")).toBe(
      "Belum dibayar",
    );
    expect(saleStatusHistoryLabel("LAIN", "Manual")).toBe("Manual");
  });

  it("merencanakan void pembayaran aktif dengan alasan transaksi", () => {
    expect(
      planSaleVoidPaymentVoids([{ id: "pay-1" }, { id: "pay-2" }], "salah input"),
    ).toEqual([
      { id: "pay-1", reason: "Pembatalan transaksi: salah input" },
      { id: "pay-2", reason: "Pembatalan transaksi: salah input" },
    ]);
    expect(planSaleVoidPaymentVoids([], "salah input")).toEqual([]);
  });
});
