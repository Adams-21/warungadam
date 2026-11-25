import Link from "next/link";

const tabClass =
  "inline-flex rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900";
const activeTabClass =
  "inline-flex rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white";

export type InventoryTab = "products" | "packaging" | "mutations";

export function InventoryTabs({ active }: { active: InventoryTab }) {
  const tabs: Array<{ key: InventoryTab; label: string }> = [
    { key: "products", label: "Stok Produk & Batch FIFO" },
    { key: "packaging", label: "Stok Kemasan" },
    { key: "mutations", label: "Kartu Stok / Riwayat Mutasi" },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/inventory?tab=${tab.key}`}
          className={active === tab.key ? activeTabClass : tabClass}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
