import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Alamat atau data yang Anda cari tidak tersedia, mungkin sudah dihapus,
          atau tautannya tidak valid.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className={primaryButtonClass}>
            Kembali ke Dashboard
          </Link>
          <Link href="/login" className={secondaryButtonClass}>
            Ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  );
}
