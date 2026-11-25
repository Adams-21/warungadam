"use client";

import { Button, secondaryButtonClass } from "@/components/ui";

export function PrintSaleButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className={secondaryButtonClass}
    >
      Cetak Nota
    </Button>
  );
}
