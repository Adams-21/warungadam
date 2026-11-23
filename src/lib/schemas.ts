import { z } from "zod";

export const uuidSchema = z.string().uuid("ID tidak valid");

export const priceSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Masukkan angka bulat tanpa titik atau koma")
  .transform((value) => BigInt(value));

export const nullableDecimalSchema = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined
      ? null
      : Number(value),
  z.number().finite().nonnegative("Tidak boleh negatif").nullable(),
);

export const positiveDecimalSchema = z.preprocess(
  (value) => Number(value),
  z.number().finite().positive("Harus lebih dari 0"),
);

export const optionalTextSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(500, "Terlalu panjang").optional(),
);
