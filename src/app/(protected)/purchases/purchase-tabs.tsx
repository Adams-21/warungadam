import Link from "next/link";

const tabClass =
  "inline-flex rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900";
const activeTabClass =
  "inline-flex rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white";

export function PurchaseTabs({
  active,
}: {
  active: "orders" | "packaging";
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
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
