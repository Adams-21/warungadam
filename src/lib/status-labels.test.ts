import { describe, expect, it } from "vitest";
import { humanizeStatusLabel } from "./status-labels";

describe("Label Status Enum", () => {
  it("merapikan status retur dan penyelesaian supplier", () => {
    expect(humanizeStatusLabel("PENGEMBALIAN_UANG")).toBe("Pengembalian uang");
    expect(humanizeStatusLabel("POTONGAN_TAGIHAN")).toBe("Potongan tagihan");
    expect(humanizeStatusLabel("Belum_diajukan")).toBe("Belum diajukan");
    expect(humanizeStatusLabel("Menunggu_pengembalian_dana")).toBe(
      "Menunggu pengembalian dana",
    );
    expect(humanizeStatusLabel("Dana_tetap_hak_penjual")).toBe(
      "Dana tetap hak penjual",
    );
  });

  it("menangani nilai kosong dan fallback enum tak dikenal", () => {
    expect(humanizeStatusLabel("")).toBe("");
    expect(humanizeStatusLabel("Status_baru")).toBe("Status Baru");
    expect(humanizeStatusLabel("Selesai")).toBe("Selesai");
  });
});
