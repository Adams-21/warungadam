import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DocumentType =
  | "SALE"
  | "PURCHASE"
  | "RECEIPT"
  | "CUSTOMER_RETURN"
  | "SUPPLIER_RETURN"
  | "PACKAGING_PURCHASE"
  | "WRITEOFF";

const DOCUMENT_SEQUENCES: Record<DocumentType, { prefix: string; sequence: string }> = {
  SALE: { prefix: "TRX", sequence: "seq_sale_number" },
  PURCHASE: { prefix: "PO", sequence: "seq_purchase_number" },
  RECEIPT: { prefix: "RCV", sequence: "seq_receipt_number" },
  CUSTOMER_RETURN: { prefix: "RTR", sequence: "seq_customer_return_number" },
  SUPPLIER_RETURN: { prefix: "RTS", sequence: "seq_supplier_return_number" },
  PACKAGING_PURCHASE: { prefix: "PKG", sequence: "seq_packaging_purchase_number" },
  WRITEOFF: { prefix: "WO", sequence: "seq_writeoff_number" },
};

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

export async function generateDocumentNumber(
  type: DocumentType,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  const { prefix, sequence } = DOCUMENT_SEQUENCES[type];
  const client = tx ?? prisma;

  const rows = await client.$queryRaw<Array<{ next_value: string }>>`
    SELECT nextval(${sequence}::regclass)::text AS next_value
  `;

  const nextValue = rows[0]?.next_value;
  if (!nextValue) {
    throw new Error(`Gagal mengambil nilai sequence ${sequence}`);
  }

  return `${prefix}-${formatDate(new Date())}-${nextValue.padStart(4, "0")}`;
}
