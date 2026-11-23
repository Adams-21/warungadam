import { PageHeading } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function DashboardPage() {
  const user = await requireAuth();
  const [settings, productCount, variantCount, supplierCount, userCount] =
    await Promise.all([
      prisma.businessSettings.findFirst({
        orderBy: { updated_at: "desc" },
        select: { business_name: true, address: true, phone: true },
      }),
      prisma.products.count(),
      prisma.productVariants.count(),
      prisma.suppliers.count(),
      prisma.users.count(),
    ]);

  const stats = [
    { label: "Produk", value: productCount },
    { label: "Varian", value: variantCount },
    { label: "Supplier", value: supplierCount },
    { label: "Pengguna", value: userCount },
  ];

  return (
    <>
      <PageHeading
        title="Dashboard"
        description="Ringkasan kondisi bisnis dan akses cepat ke modul utama."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-zinc-600">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            Informasi Bisnis
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-zinc-500">Nama bisnis</dt>
              <dd className="font-medium text-zinc-900">
                {settings?.business_name ?? "BizManage"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Alamat</dt>
              <dd className="text-zinc-900">{settings?.address ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Telepon</dt>
              <dd className="text-zinc-900">{settings?.phone ?? "-"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            Sesi Aktif
          </h2>
          <p className="mt-4 text-sm text-zinc-600">
            Login sebagai <span className="font-medium">{user.username}</span>{" "}
            dengan peran <span className="font-medium">{user.role}</span>.
          </p>
          <p className="mt-3 text-sm text-zinc-600">
            Gunakan menu sidebar untuk mengelola master data dan transaksi.
          </p>
        </section>
      </div>
    </>
  );
}
