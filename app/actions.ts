"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, isPinVerified } from "@/lib/auth";
import type { ActionState } from "./action-state";

async function requireLogin(): Promise<ActionState | null> {
  const user = await getCurrentUser();
  return user
    ? null
    : { success: false, message: "Sesi berakhir. Silakan login ulang." };
}

async function requirePinVerified(): Promise<ActionState | null> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Sesi berakhir. Silakan login ulang." };
  }
  return (await isPinVerified(user.id))
    ? null
    : { success: false, message: "Verifikasi PIN laporan diperlukan." };
}

export async function createCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await requireLogin();
  if (authError) return authError;

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { success: false, message: "Nama kategori wajib diisi." };
  }

  try {
    await db.category.create({ data: { name } });
    revalidatePath("/categories");
    return { success: true, message: `Kategori "${name}" berhasil ditambahkan.` };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, message: `Kategori "${name}" sudah ada.` };
    }
    return { success: false, message: "Gagal menambahkan kategori." };
  }
}

export async function deleteCategory(id: string): Promise<ActionState> {
  const authError = await requireLogin();
  if (authError) return authError;

  if (!id) {
    return { success: false, message: "Kategori tidak ditemukan." };
  }

  try {
    const productCount = await db.product.count({ where: { categoryId: id } });

    if (productCount > 0) {
      return {
        success: false,
        message: `Kategori masih dipakai oleh ${productCount} produk.`,
      };
    }

    await db.category.delete({ where: { id } });
    revalidatePath("/categories");
    return { success: true, message: "Kategori berhasil dihapus." };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Kategori tidak ditemukan." };
    }
    return { success: false, message: "Gagal menghapus kategori." };
  }
}

type ParsedProduct =
  | {
      data: {
        name: string;
        sku: string | null;
        stock: number;
        buyPrice: number;
        sellPrice: number;
        expiredAt: Date | null;
        categoryId: string;
      };
    }
  | { error: string };

function parsePrice(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function parseProductForm(formData: FormData): ParsedProduct {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama produk wajib diisi." };

  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) return { error: "Kategori wajib dipilih." };

  const stockRaw = String(formData.get("stock") ?? "0").trim();
  const stock = stockRaw === "" ? 0 : Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: "Stok harus berupa angka bulat 0 atau lebih." };
  }

  const buyPrice = parsePrice(formData.get("buyPrice"));
  if (buyPrice === null) {
    return { error: "Harga beli wajib diisi dan tidak boleh negatif." };
  }

  const sellPrice = parsePrice(formData.get("sellPrice"));
  if (sellPrice === null) {
    return { error: "Harga jual wajib diisi dan tidak boleh negatif." };
  }

  const skuRaw = String(formData.get("sku") ?? "").trim();

  const expiredRaw = String(formData.get("expiredAt") ?? "").trim();
  let expiredAt: Date | null = null;
  if (expiredRaw !== "") {
    const parsedDate = new Date(expiredRaw);
    if (Number.isNaN(parsedDate.getTime())) {
      return { error: "Tanggal kedaluwarsa tidak valid." };
    }
    expiredAt = parsedDate;
  }

  return {
    data: {
      name,
      sku: skuRaw === "" ? null : skuRaw,
      stock,
      buyPrice,
      sellPrice,
      expiredAt,
      categoryId,
    },
  };
}

function productErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "SKU sudah dipakai produk lain.";
    if (error.code === "P2003") return "Kategori yang dipilih tidak valid.";
    if (error.code === "P2025") return "Produk tidak ditemukan.";
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

export async function createProduct(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await requirePinVerified();
  if (authError) return authError;

  const parsed = parseProductForm(formData);
  if ("error" in parsed) {
    return { success: false, message: parsed.error };
  }

  try {
    await db.product.create({ data: parsed.data });
    revalidatePath("/products");
    return {
      success: true,
      message: `Produk "${parsed.data.name}" berhasil ditambahkan.`,
    };
  } catch (error) {
    return { success: false, message: productErrorMessage(error) };
  }
}

export async function updateProduct(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await requirePinVerified();
  if (authError) return authError;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { success: false, message: "Produk tidak ditemukan." };
  }

  const parsed = parseProductForm(formData);
  if ("error" in parsed) {
    return { success: false, message: parsed.error };
  }

  try {
    await db.product.update({ where: { id }, data: parsed.data });
    revalidatePath("/products");
    return {
      success: true,
      message: `Produk "${parsed.data.name}" berhasil diperbarui.`,
    };
  } catch (error) {
    return { success: false, message: productErrorMessage(error) };
  }
}

export async function deleteProduct(id: string): Promise<ActionState> {
  const authError = await requirePinVerified();
  if (authError) return authError;

  if (!id) {
    return { success: false, message: "Produk tidak ditemukan." };
  }

  try {
    const usedInTransactions = await db.transactionItem.count({
      where: { productId: id },
    });

    if (usedInTransactions > 0) {
      return {
        success: false,
        message: `Produk dipakai di ${usedInTransactions} transaksi, tidak bisa dihapus.`,
      };
    }

    await db.product.delete({ where: { id } });
    revalidatePath("/products");
    return { success: true, message: "Produk berhasil dihapus." };
  } catch (error) {
    return { success: false, message: productErrorMessage(error) };
  }
}

// --- TRANSACTIONS ---

export type TransactionCartItem = {
  productId: string;
  quantity: number;
};

export type TransactionInput = {
  items: TransactionCartItem[];
};

export async function createTransaction(
  input: TransactionInput,
): Promise<ActionState> {
  const authError = await requireLogin();
  if (authError) return authError;

  if (!input || !Array.isArray(input.items) || input.items.length === 0) {
    return { success: false, message: "Keranjang masih kosong." };
  }

  for (const item of input.items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { success: false, message: "Data item keranjang tidak valid." };
    }
  }

  try {
    const products = await db.product.findMany({
      where: { id: { in: input.items.map((item) => item.productId) } },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const itemData: { productId: string; quantity: number; price: number }[] = [];
    let totalAmount = 0;

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return { success: false, message: "Salah satu produk tidak ditemukan." };
      }
      if (product.stock < item.quantity) {
        return {
          success: false,
          message: `Stok "${product.name}" tidak cukup (sisa ${product.stock}).`,
        };
      }
      itemData.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.sellPrice,
      });
      totalAmount += product.sellPrice * item.quantity;
    }

    await db.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          totalAmount,
          items: { create: itemData },
        },
      });

      for (const item of itemData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    });

    revalidatePath("/cashier");
    revalidatePath("/products");
    return {
      success: true,
      message: `Transaksi berhasil! Total Rp${totalAmount.toLocaleString("id-ID")}.`,
    };
  } catch {
    return { success: false, message: "Gagal memproses transaksi." };
  }
}
