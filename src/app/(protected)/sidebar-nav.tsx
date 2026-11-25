"use client";

import { CompactActionForm } from "@/components/compact-action-form";
import { Button } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const navigation = [
  {
    label: "Utama",
    items: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    label: "Operasional",
    items: [
      { label: "Kasir / Penjualan", href: "/sales" },
      { label: "Pembelian", href: "/purchases" },
      { label: "Stok & Penyesuaian", href: "/inventory" },
    ],
  },
  {
    label: "Retur & Pengeluaran",
    items: [
      { label: "Retur Pelanggan", href: "/customer-returns" },
      { label: "Retur Supplier", href: "/supplier-returns" },
      { label: "Pengeluaran", href: "/expenses" },
    ],
  },
  {
    label: "Master Data",
    items: [
      { label: "Produk & Varian", href: "/master/products" },
      { label: "Kemasan & Ukuran Paket", href: "/master/packaging" },
      { label: "Supplier", href: "/master/suppliers" },
      { label: "Pengaturan Bisnis", href: "/settings" },
    ],
  },
] as const;

export function SidebarNav({
  businessName,
  username,
  role,
  logoutAction,
  children,
}: {
  businessName: string;
  username: string;
  role: string;
  logoutAction: () => Promise<ActionState>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const renderNavigation = (onNavigate?: () => void) => (
    <nav
      aria-label="Navigasi utama"
      className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5"
    >
      {navigation.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {group.label}
          </p>
          <div className="mt-2 space-y-1">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`block rounded-md border-l-4 px-3 py-2 text-sm transition-colors ${
                  isActive(item.href)
                    ? "border-teal-600 bg-teal-50 font-semibold text-teal-700"
                    : "border-transparent text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden flex-col border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="shrink-0 border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            BizManage
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {businessName}
          </p>
        </div>
        {renderNavigation()}
        <div className="shrink-0 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          {username} · {role}
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              aria-controls="mobile-sidebar"
              aria-expanded={open}
              className="border-slate-200 text-slate-700 lg:hidden"
            >
              Menu
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                BizManage
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">
                {businessName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{username}</p>
              <p className="text-xs text-slate-500">{role}</p>
            </div>
            <Link
              href="/change-password"
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 sm:px-3 sm:text-sm"
            >
              Ganti Password
            </Link>
            <CompactActionForm
              action={logoutAction}
              submitLabel="Log Out"
              buttonClassName="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-sm"
            />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {open ? (
        <Button
          type="button"
          variant="ghost"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 h-auto w-auto rounded-none bg-black/40 p-0 hover:bg-black/50 lg:hidden"
        />
      ) : null}

      <aside
        id="mobile-sidebar"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              BizManage
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {businessName}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-sm text-slate-600 hover:text-teal-700"
          >
            Tutup
          </Button>
        </div>
        {renderNavigation(() => setOpen(false))}
        <div className="shrink-0 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          {username} · {role}
        </div>
      </aside>
    </div>
  );
}
