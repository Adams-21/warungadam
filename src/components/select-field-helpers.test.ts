import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import {
  collectSelectFieldOptions,
  reactNodeToText,
  resolveSelectFieldLabel,
} from "./select-field-helpers";

const UUID = "9c1f6b7a-1f2e-4a3b-8c4d-5e6f7a8b9c0d";

describe("Label SelectField", () => {
  it("mengubah children React menjadi teks label", () => {
    expect(reactNodeToText("Kopi Susu — Original")).toBe("Kopi Susu — Original");
    expect(
      reactNodeToText(
        createElement(
          Fragment,
          null,
          "Kardus ",
          createElement("span", null, "(unit)"),
        ),
      ),
    ).toBe("Kardus (unit)");
    expect(reactNodeToText(null)).toBe("");
  });

  it("mengumpulkan opsi dari option biasa, fragment, dan children bersarang", () => {
    const options = collectSelectFieldOptions([
      createElement("option", { value: UUID }, "Kopi Susu — Original"),
      createElement(
        Fragment,
        null,
        createElement("option", { value: "size-1" }, "Kecil (12 x 10)"),
      ),
      createElement(
        "option",
        { value: "supplier-1" },
        createElement("span", null, "PT Sumber Rejeki"),
      ),
    ]);

    expect(options).toEqual([
      { value: UUID, label: "Kopi Susu — Original", disabled: undefined },
      { value: "size-1", label: "Kecil (12 x 10)", disabled: undefined },
      { value: "supplier-1", label: "PT Sumber Rejeki", disabled: undefined },
    ]);
  });

  it("memakai label nama untuk UUID dan fallback placeholder untuk nilai asing", () => {
    const options = collectSelectFieldOptions([
      createElement("option", { value: UUID }, "Toko Offline"),
    ]);

    expect(resolveSelectFieldLabel(options, UUID, "Pilih kanal")).toBe(
      "Toko Offline",
    );
    expect(resolveSelectFieldLabel(options, "", "Pilih kanal")).toBe(
      "Pilih kanal",
    );
    expect(
      resolveSelectFieldLabel(
        [
          {
            value: "",
            label: "Tanpa kemasan standar",
          },
        ],
        "",
        "Pilih ukuran",
      ),
    ).toBe("Tanpa kemasan standar");
    expect(
      resolveSelectFieldLabel(
        options,
        "22222222-2222-4222-8222-222222222222",
        "Pilih kanal",
      ),
    ).toBe("Pilih kanal");
  });
});
