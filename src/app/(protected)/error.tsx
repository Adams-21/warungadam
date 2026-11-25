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
      title="HalamanBisManage tidak dapat dimuat"
      description="Terjadi kendala saat menampilkan data. Silakan coba lagi atau kembali ke dashboard."
    />
  );
}
