import Link from "next/link";

const tabClass =
  "inline-flex rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";
const activeTabClass =
  "inline-flex rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white";

export function PurchaseTabs({
  active,
}: {
  active: "orders" | "packaging";
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
      <Link
        href="/purchases"
        className={active === "orders" ? activeTabClass : tabClass}
      >
        Pesanan Produk
      </Link>
      <Link
        href="/purchases/packaging"
        className={active === "packaging" ? activeTabClass : tabClass}
      >
        Pembelian Kemasan
      </Link>
    </div>
  );
}
