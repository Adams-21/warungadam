"use client";

import { secondaryButtonClass } from "@/components/ui";

export function PrintSaleButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={secondaryButtonClass}
    >
      Cetak Nota
    </button>
  );
}
