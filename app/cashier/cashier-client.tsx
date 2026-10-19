"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { createTransaction } from "@/app/actions";
import { useCart } from "@/lib/use-cart";
import {
  expiryLabel,
  expiryTone,
  formatDate,
  getExpiryStatus,
} from "@/lib/expiry";

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const categoryKeywordTones: { keywords: string[]; className: string }[] = [
  {
    keywords: ["minum", "air", "kopi", "teh", "susu", "jus", "soda"],
    className: "bg-blue-50 text-blue-700",
  },
  {
    keywords: ["makan", "mie", "mi", "nasi", "roti", "bubur"],
    className: "bg-amber-50 text-amber-700",
  },
  {
    keywords: ["snack", "cemil", "jajan", "kue", "biskuit", "permen"],
    className: "bg-pink-50 text-pink-700",
  },
  {
    keywords: ["sembako", "beras", "gula", "minyak", "telur", "tepung"],
    className: "bg-emerald-50 text-emerald-700",
  },
  {
    keywords: ["sayur", "buah", "segar"],
    className: "bg-lime-50 text-lime-700",
  },
  {
    keywords: ["rokok", "obat", "kebersihan", "sabun"],
    className: "bg-slate-100 text-slate-700",
  },
];

const fallbackTones = [
  "bg-violet-50 text-violet-700",
  "bg-sky-50 text-sky-700",
  "bg-rose-50 text-rose-700",
  "bg-teal-50 text-teal-700",
];

function categoryTone(name: string) {
  const lower = name.toLowerCase();
  const match = categoryKeywordTones.find((tone) =>
    tone.keywords.some((keyword) => lower.includes(keyword)),
  );
  if (match) return match.className;

  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) % fallbackTones.length;
  }
  return fallbackTones[hash];
}

function isSystemSku(sku: string | null) {
  return !!sku && sku.startsWith("PRD-");
}

function ProductCard({ product }: { product: ProductWithCategory }) {
  const items = useCart((state) => state.items);
  const addToCart = useCart((state) => state.addToCart);

  const inCart = items.find((item) => item.id === product.id)?.quantity ?? 0;
  const soldOut = product.stock === 0;
  const maxedOut = !soldOut && inCart >= product.stock;
  const expiryStatus = getExpiryStatus(product.expiredAt);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex max-w-[70%] truncate rounded-full px-2.5 py-0.5 text-[11px] font-medium ${categoryTone(product.category.name)}`}
          title={product.category.name}
        >
          {product.category.name}
        </span>

        {product.expiredAt && expiryStatus && (
          <span
            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${expiryTone(expiryStatus)}`}
            title={`Kedaluwarsa: ${formatDate(product.expiredAt)}`}
          >
            {expiryLabel(expiryStatus)}
          </span>
        )}
      </div>

      <p className="mt-3 truncate font-semibold text-slate-800" title={product.name}>
        {product.name}
      </p>

      <p className="truncate text-xs text-slate-500">
        {product.sku ? (
          isSystemSku(product.sku) ? (
            <span
              title="SKU dibuat otomatis oleh sistem"
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              {product.sku}
            </span>
          ) : (
            `SKU: ${product.sku}`
          )
        ) : (
          "Tanpa SKU"
        )}
      </p>

      <p className="mt-2 text-lg font-bold text-slate-900">
        {rupiah.format(product.sellPrice)}
      </p>
      <p className={`text-xs ${soldOut ? "text-red-500" : "text-slate-400"}`}>
        Stok: {product.stock}
      </p>

      <button
        type="button"
        onClick={() =>
          addToCart({
            id: product.id,
            name: product.name,
            price: product.sellPrice,
            stock: product.stock,
          })
        }
        disabled={soldOut || maxedOut}
        className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {soldOut
          ? "Stok habis"
          : maxedOut
            ? "Maks. stok"
            : "Tambah ke Keranjang"}
      </button>
    </div>
  );
}

function CartSidebar() {
  const router = useRouter();
  const items = useCart((state) => state.items);
  const updateQuantity = useCart((state) => state.updateQuantity);
  const removeFromCart = useCart((state) => state.removeFromCart);
  const clearCart = useCart((state) => state.clearCart);
  const totalPrice = useCart((state) => state.getTotalPrice());

  const [isPending, startTransition] = useTransition();
  const [cashGiven, setCashGiven] = useState("");
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const hasCash = cashGiven.trim() !== "";
  const cashValue = hasCash ? Number(cashGiven) || 0 : 0;
  const change = cashValue - totalPrice;
  const canPay = items.length > 0 && hasCash && cashValue >= totalPrice;

  function handleReset() {
    setFeedback(null);
    if (items.length === 0) return;
    if (window.confirm("Kosongkan keranjang?")) {
      clearCart();
      setCashGiven("");
    }
  }

  function handlePay() {
    if (!canPay) return;
    setFeedback(null);

    startTransition(async () => {
      const result = await createTransaction({
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });
      setFeedback(result);
      if (result.success) {
        clearCart();
        setCashGiven("");
        router.refresh();
      }
    });
  }

  return (
    <aside className="flex h-fit flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Keranjang</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {itemCount} item
        </span>
      </div>

      {feedback && (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            feedback.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {feedback.message}
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
          Keranjang masih kosong. Klik produk di kiri untuk memulai transaksi.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {item.name}
                </p>
                <p className="text-xs text-slate-500">
                  {rupiah.format(item.price)} / item
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-sm transition-colors hover:bg-slate-100"
                    aria-label={`Kurangi jumlah ${item.name}`}
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-sm transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Tambah jumlah ${item.name}`}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="text-sm font-medium text-slate-600">Total Belanja</span>
        <span className="text-lg font-bold text-slate-900">
          {rupiah.format(totalPrice)}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <label
          htmlFor="cash-given"
          className="text-xs font-medium text-slate-600"
        >
          Uang Diterima
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="cash-given"
            type="number"
            min={0}
            inputMode="numeric"
            value={cashGiven}
            onChange={(event) => setCashGiven(event.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            type="button"
            onClick={() => setCashGiven(String(totalPrice))}
            disabled={items.length === 0}
            className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Uang Pas
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Kembalian</span>
        <span
          className={`text-base font-bold ${
            !hasCash
              ? "text-slate-400"
              : change >= 0
                ? "text-emerald-600"
                : "text-red-600"
          }`}
        >
          {rupiah.format(hasCash ? Math.abs(change) : 0)}
        </span>
      </div>

      {hasCash && change < 0 && (
        <p className="mt-1 text-xs font-medium text-red-500">
          Uang diterima kurang {rupiah.format(Math.abs(change))}.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={handlePay}
          disabled={isPending || !canPay}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Memproses..." : "Bayar / Proses Transaksi"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending || items.length === 0}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset Keranjang
        </button>
      </div>
    </aside>
  );
}

export function CashierClient({
  products,
}: {
  products: ProductWithCategory[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        (product.sku ?? "").toLowerCase().includes(keyword),
    );
  }, [products, query]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari produk berdasarkan nama atau SKU..."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />

        {products.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-400">
            Belum ada produk. Tambahkan produk dulu di halaman Produk.
          </p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-400">
            Tidak ada produk yang cocok dengan &quot;{query}&quot;.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <CartSidebar />
    </div>
  );
}