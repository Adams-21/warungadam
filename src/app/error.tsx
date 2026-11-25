"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function Error({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Terjadi kesalahan pada aplikasi"
      description="Halaman tidak dapat ditampilkan sementara ini. Silakan coba lagi atau kembali ke dashboard."
    />
  );
}
