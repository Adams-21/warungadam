import Link from "next/link";

const tabClass =
  "inline-flex rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";
const activeTabClass =
  "inline-flex rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white";

export type InventoryTab = "products" | "packaging" | "mutations";

export function InventoryTabs({ active }: { active: InventoryTab }) {
  const tabs: Array<{ key: InventoryTab; label: string }> = [
    { key: "products", label: "Stok Produk & Batch FIFO" },
    { key: "packaging", label: "Stok Kemasan" },
    { key: "mutations", label: "Kartu Stok / Riwayat Mutasi" },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
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
