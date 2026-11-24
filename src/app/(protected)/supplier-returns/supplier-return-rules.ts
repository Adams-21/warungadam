import { Prisma, SupplierReturnResolution } from "@prisma/client";
import { roundToBigInt } from "../purchases/purchase-rules";

export type SupplierReturnItemInput = {
  goods_receipt_item_id: string;
  batch_id: string;
  variant_id: string;
  qty: Prisma.Decimal;
  unit_price: bigint;
};

export type SupplierReturnReceiptContext = {
  goods_receipt_item_id: string;
  batch_id: string;
  variant_id: string;
  received_qty: Prisma.Decimal;
  prior_returned_qty: Prisma.Decimal;
  batch_remaining_qty: Prisma.Decimal;
  unit_price: bigint;
};

export type SupplierReturnPlanItem = SupplierReturnItemInput & {
  subtotal: bigint;
};

export function validateSupplierReturnItems(
  items: SupplierReturnItemInput[],
  contexts: SupplierReturnReceiptContext[],
): string | null {
  if (items.length === 0) {
    return "Minimal satu barang retur wajib diisi.";
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (!item.qty.isFinite() || item.qty.lte(0)) {
      return "Jumlah retur harus lebih dari 0.";
    }
    if (item.unit_price < BigInt(0)) {
      return "Harga satuan retur tidak boleh negatif.";
    }
    if (seen.has(item.goods_receipt_item_id)) {
      return "Barang penerimaan tidak boleh duplikat dalam satu retur.";
    }
    seen.add(item.goods_receipt_item_id);

    const context = contexts.find(
      (row) => row.goods_receipt_item_id === item.goods_receipt_item_id,
    );
    if (!context) {
      return "Barang penerimaan retur tidak ditemukan pada pembelian ini.";
    }
    if (
      context.batch_id !== item.batch_id ||
      context.variant_id !== item.variant_id
    ) {
      return "Batch atau varian barang retur tidak sesuai dengan penerimaan.";
    }

    const returnableQty = context.received_qty.minus(context.prior_returned_qty);
    if (returnableQty.lt(0) || item.qty.gt(returnableQty)) {
      return "Jumlah retur melebihi barang yang belum diretur.";
    }
    if (item.qty.gt(context.batch_remaining_qty)) {
      return "Jumlah retur melebihi sisa stok batch penerimaan.";
    }
  }

  return null;
}

export function calculateSupplierReturnAmount(
  items: SupplierReturnItemInput[],
): bigint {
  return items.reduce(
    (sum, item) =>
      sum +
        roundToBigInt(
          new Prisma.Decimal(item.unit_price.toString()).mul(item.qty.toString()),
        ),
    BigInt(0),
  );
}

export function validateSupplierReturnAmount({
  calculated_amount,
  return_amount,
  remaining_amount,
  resolution_type,
  settlement_date,
}: {
  calculated_amount: bigint;
  return_amount: bigint;
  remaining_amount: bigint;
  resolution_type: SupplierReturnResolution;
  settlement_date: Date | null;
}): string | null {
  if (return_amount < BigInt(0)) {
    return "Nominal retur tidak boleh negatif.";
  }
  if (return_amount > calculated_amount) {
    return "Nominal retur tidak boleh melebihi nilai barang yang diretur.";
  }
  if (
    resolution_type === SupplierReturnResolution.POTONGAN_TAGIHAN &&
    return_amount > remaining_amount
  ) {
    return "Potongan tagihan tidak boleh melebihi sisa tagihan pembelian.";
  }
  if (
    resolution_type === SupplierReturnResolution.PENGEMBALIAN_UANG &&
    return_amount > BigInt(0) &&
    !settlement_date
  ) {
    return "Tanggal realisasi pengembalian dana wajib diisi.";
  }
  return null;
}

export function planSupplierReturnItems(
  items: SupplierReturnItemInput[],
): SupplierReturnPlanItem[] {
  return items.map((item) => ({
    ...item,
    subtotal: roundToBigInt(
      new Prisma.Decimal(item.unit_price.toString()).mul(item.qty.toString()),
    ),
  }));
}
