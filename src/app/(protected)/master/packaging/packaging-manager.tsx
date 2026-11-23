"use client";

import { useActionState, useState } from "react";
import {
  ActionMessage,
  Panel,
  SubmitButton,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { formatNumber, formatRupiah } from "@/lib/format";
import {
  createMaterialAction,
  createPackageSizeAction,
  deletePackageItemAction,
  deletePackageSizeAction,
  toggleMaterialActiveAction,
  togglePackageSizeActiveAction,
  upsertPackageItemAction,
} from "./actions";
import type {
  PackagingMaterialView,
  PackageSizeView,
  UnitOptionView,
} from "./types";

type ToggleAction = (formData: FormData) => Promise<void>;

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

function ToggleForm({
  action,
  id,
  active,
}: {
  action: ToggleAction;
  id: string;
  active: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={secondaryButtonClass}>
        {active ? "Nonaktifkan" : "Aktifkan"}
      </button>
    </form>
  );
}

function PackageSizeDeleteButton({
  packageSizeId,
}: {
  packageSizeId: string;
}) {
  const [state, setState] = useState<ActionState>(EMPTY_ACTION_STATE);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      setState(await deletePackageSizeAction(packageSizeId));
    } catch {
      setState({ error: "Gagal menghapus ukuran paket." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Menghapus..." : "Hapus"}
      </button>
      <ActionMessage state={state} />
    </div>
  );
}

function MaterialForm({ units }: { units: UnitOptionView[] }) {
  const [state, formAction, pending] = useActionState(
    createMaterialAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Tambah Material Kemasan"
      description="Konversi satuan beli ke satuan pakai dipakai saat menghitung HPP."
    >
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="material-name" className="text-sm font-medium">
            Nama material
          </label>
          <input
            id="material-name"
            name="name"
            required
            className={inputClass}
            placeholder="Contoh: Bubble Wrap"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="material-purchase-unit"
              className="text-sm font-medium"
            >
              Satuan beli
            </label>
            <select
              id="material-purchase-unit"
              name="purchase_unit_id"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Pilih satuan
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="material-usage-unit" className="text-sm font-medium">
              Satuan pakai
            </label>
            <select
              id="material-usage-unit"
              name="usage_unit_id"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Pilih satuan
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="material-conversion"
              className="text-sm font-medium"
            >
              Faktor konversi
            </label>
            <input
              id="material-conversion"
              name="conversion_factor"
              type="number"
              min="0.0001"
              step="0.0001"
              required
              className={inputClass}
              placeholder="12"
            />
          </div>
          <div>
            <label htmlFor="material-min-stock" className="text-sm font-medium">
              Stok minimum
            </label>
            <input
              id="material-min-stock"
              name="min_stock"
              type="number"
              min="0"
              step="0.0001"
              className={inputClass}
              placeholder="Opsional"
            />
          </div>
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Material</SubmitButton>
      </form>
    </Panel>
  );
}

function PackageSizeForm() {
  const [state, formAction, pending] = useActionState(
    createPackageSizeAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Tambah Ukuran Paket"
      description="Ukuran paket dipakai sebagai standar komposisi kemasan."
    >
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="size-name" className="text-sm font-medium">
            Nama ukuran
          </label>
          <input
            id="size-name"
            name="name"
            required
            className={inputClass}
            placeholder="Contoh: Paket A"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="size-dimension" className="text-sm font-medium">
              Label dimensi
            </label>
            <input
              id="size-dimension"
              name="dimension_label"
              className={inputClass}
              placeholder="Contoh: 20x15x8 cm"
            />
          </div>
          <div>
            <label htmlFor="size-order" className="text-sm font-medium">
              Urutan tampil
            </label>
            <input
              id="size-order"
              name="sort_order"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              className={inputClass}
            />
          </div>
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Ukuran</SubmitButton>
      </form>
    </Panel>
  );
}

function PackageItemForm({
  sizes,
  materials,
}: {
  sizes: PackageSizeView[];
  materials: PackagingMaterialView[];
}) {
  const [state, formAction, pending] = useActionState(
    upsertPackageItemAction,
    EMPTY_ACTION_STATE,
  );
  const activeSizes = sizes.filter((size) => size.is_active);

  return (
    <Panel
      title="Komposisi Ukuran Paket"
      description="Tambahkan material dan jumlah pemakaian default per paket."
    >
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="item-size" className="text-sm font-medium">
            Ukuran paket
          </label>
          <select
            id="item-size"
            name="package_size_id"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Pilih ukuran
            </option>
            {activeSizes.map((size) => (
              <option key={size.id} value={size.id}>
                {size.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="item-material" className="text-sm font-medium">
            Material
          </label>
          <select
            id="item-material"
            name="packaging_material_id"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Pilih material
            </option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="item-usage" className="text-sm font-medium">
            Pemakaian default
          </label>
          <input
            id="item-usage"
            name="default_usage_qty"
            type="number"
            min="0.0001"
            step="0.0001"
            required
            className={inputClass}
            placeholder="1"
          />
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Simpan Komposisi</SubmitButton>
      </form>
    </Panel>
  );
}

export function PackagingManager({
  materials,
  sizes,
  units,
}: {
  materials: PackagingMaterialView[];
  sizes: PackageSizeView[];
  units: UnitOptionView[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <MaterialForm units={units} />
        <PackageSizeForm />
        <PackageItemForm sizes={sizes} materials={materials} />
      </div>

      <Panel
        title="Daftar Material Kemasan"
        description={`${materials.length} material terdaftar.`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead>
              <tr>
                <th className={thClass}>Material</th>
                <th className={thClass}>Konversi</th>
                <th className={thClass}>Stok</th>
                <th className={thClass}>Biaya rata-rata</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {materials.map((material) => (
                <tr key={material.id}>
                  <td className={tdClass}>
                    <p className="font-medium">{material.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Beli per {material.purchase_unit_name} · Pakai per{" "}
                      {material.usage_unit_name}
                    </p>
                  </td>
                  <td className={tdClass}>
                    {formatNumber(material.conversion_factor, 4)}
                  </td>
                  <td className={tdClass}>
                    <p>{formatNumber(material.stock_qty, 4)}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Min.{" "}
                      {material.min_stock === null
                        ? "-"
                        : formatNumber(material.min_stock, 4)}
                    </p>
                  </td>
                  <td className={tdClass}>
                    {formatRupiah(material.average_unit_cost)}
                  </td>
                  <td className={tdClass}>
                    <ToggleForm
                      action={toggleMaterialActiveAction}
                      id={material.id}
                      active={material.is_active}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Daftar Ukuran Paket"
        description="Estimasi HPP dihitung dari pemakaian default dikali biaya rata-rata material."
      >
        {sizes.length === 0 ? (
          <p className="text-sm text-zinc-600">Belum ada ukuran paket.</p>
        ) : (
          <div className="space-y-4">
            {sizes.map((size) => (
              <div
                key={size.id}
                className="rounded-lg border border-zinc-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">{size.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {size.dimension_label || "Tanpa label dimensi"} · Urutan{" "}
                      {size.sort_order}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold text-zinc-900">
                      Estimasi HPP {formatRupiah(size.estimated_hpp)}
                    </p>
                    <ToggleForm
                      action={togglePackageSizeActiveAction}
                      id={size.id}
                      active={size.is_active}
                    />
                    {size.sales_count === 0 ? (
                      <PackageSizeDeleteButton packageSizeId={size.id} />
                    ) : (
                      <span className="text-xs text-zinc-500">
                        Dipakai {size.sales_count} transaksi
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200">
                    <thead>
                      <tr>
                        <th className={thClass}>Material</th>
                        <th className={thClass}>Pemakaian</th>
                        <th className={thClass}>Biaya</th>
                        <th className={thClass}>Subtotal</th>
                        <th className={thClass}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {size.items.length === 0 ? (
                        <tr>
                          <td className={tdClass} colSpan={5}>
                            Belum ada komposisi.
                          </td>
                        </tr>
                      ) : (
                        size.items.map((item) => (
                          <tr key={item.id}>
                            <td className={tdClass}>{item.material_name}</td>
                            <td className={tdClass}>
                              {formatNumber(item.default_usage_qty, 4)}
                            </td>
                            <td className={tdClass}>
                              {formatRupiah(item.unit_cost)}
                            </td>
                            <td className={tdClass}>
                              {formatRupiah(item.subtotal)}
                            </td>
                            <td className={tdClass}>
                              <form action={deletePackageItemAction}>
                                <input type="hidden" name="id" value={item.id} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                                >
                                  Hapus
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
