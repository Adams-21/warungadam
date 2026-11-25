import { describe, expect, it } from "vitest";
import { materialOptionLabel } from "./option-labels";

describe("Label Opsi Material", () => {
  it("menampilkan nama material dan satuan", () => {
    expect(materialOptionLabel("Kardus", "pcs")).toBe("Kardus — pcs");
    expect(materialOptionLabel("Bubble wrap", "meter")).toBe(
      "Bubble wrap — meter",
    );
  });

  it("tetap aman bila satuan kosong", () => {
    expect(materialOptionLabel("Lakban", "")).toBe("Lakban");
    expect(materialOptionLabel("Lakban", null)).toBe("Lakban");
    expect(materialOptionLabel("Lakban")).toBe("Lakban");
  });
});
