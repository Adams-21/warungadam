import { db } from "./db";

// --- CATEGORIES ---
export async function getCategories() {
  return await db.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
}

// --- PRODUCTS ---
export async function getProducts() {
  return await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
    },
  });
}

export async function getProductById(id: string) {
  return await db.product.findUnique({
    where: { id },
    include: { category: true },
  });
}

// --- TRANSACTIONS ---
export async function getRecentTransactions(limit = 10) {
  return await db.transaction.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getDashboardStats() {
  const totalProducts = await db.product.count();
  const totalCategories = await db.category.count();
  const transactions = await db.transaction.findMany();

  const totalRevenue = transactions.reduce(
    (acc, item) => acc + item.totalAmount,
    0
  );

  return {
    totalProducts,
    totalCategories,
    totalTransactions: transactions.length,
    totalRevenue,
  };
}

