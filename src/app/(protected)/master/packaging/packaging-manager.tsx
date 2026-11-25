"use client";

import { useActionState, useState } from "react";
import {
  ActionMessage,
  Button,
  Input,
  Label,
  Panel,
  SubmitButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { CompactActionForm } from "@/components/compact-action-form";
import { SelectField } from "@/components/select-field";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { formatNumber, formatRupiah } from "@/lib/format";
import { materialOptionLabel } from "@/lib/option-labels";
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

type ToggleAction = (formData: FormData) => Promise<ActionState>;

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
    <CompactActionForm
      action={action}
      submitLabel={active ? "Nonaktifkan" : "Aktifkan"}
    >
      <input type="hidden" name="id" value={id} />
    </CompactActionForm>
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
      <Button
        type="button"
        variant="outline"
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Menghapus..." : "Hapus"}
      </Button>
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
          <Label htmlFor="material-name" className="text-sm font-medium">
            Nama material
          </Label>
          <Input
            id="material-name"
            name="name"
            required
            className="mt-1 h-10 bg-white"
            placeholder="Contoh: Bubble Wrap"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label
              htmlFor="material-purchase-unit"
              className="text-sm font-medium"
            >
              Satuan beli
            </Label>
            <SelectField
              name="purchase_unit_id"
              defaultValue=""
              id="material-purchase-unit"
              className="mt-1 h-10 w-full bg-white"
            >
              <option value="" disabled>
                Pilih satuan
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <Label htmlFor="material-usage-unit" className="text-sm font-medium">
              Satuan pakai
            </Label>
            <SelectField
              name="usage_unit_id"
              defaultValue=""
              id="material-usage-unit"
              className="mt-1 h-10 w-full bg-white"
            >
              <option value="" disabled>
                Pilih satuan
              </option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label
              htmlFor="material-conversion"
              className="text-sm font-medium"
            >
              Faktor konversi
            </Label>
            <Input
              id="material-conversion"
              name="conversion_factor"
              type="number"
              min="0.0001"
              step="0.0001"
              required
              className="mt-1 h-10 bg-white"
              placeholder="12"
            />
          </div>
          <div>
            <Label htmlFor="material-min-stock" className="text-sm font-medium">
              Stok minimum
            </Label>
            <Input
              id="material-min-stock"
              name="min_stock"
              type="number"
              min="0"
              step="0.0001"
              className="mt-1 h-10 bg-white"
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
          <Label htmlFor="size-name" className="text-sm font-medium">
            Nama ukuran
          </Label>
          <Input
            id="size-name"
            name="name"
            required
            className="mt-1 h-10 bg-white"
            placeholder="Contoh: Paket A"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="size-dimension" className="text-sm font-medium">
              Label dimensi
            </Label>
            <Input
              id="size-dimension"
              name="dimension_label"
              className="mt-1 h-10 bg-white"
              placeholder="Contoh: 20x15x8 cm"
            />
          </div>
          <div>
            <Label htmlFor="size-order" className="text-sm font-medium">
              Urutan tampil
            </Label>
            <Input
              id="size-order"
              name="sort_order"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              className="mt-1 h-10 bg-white"
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
          <Label htmlFor="item-size" className="text-sm font-medium">
            Ukuran paket
          </Label>
          <SelectField
            name="package_size_id"
            defaultValue=""
            id="item-size"
            className="mt-1 h-10 w-full bg-white"
          >
            <option value="" disabled>
              Pilih ukuran
            </option>
            {activeSizes.map((size) => (
              <option key={size.id} value={size.id}>
                {size.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <Label htmlFor="item-material" className="text-sm font-medium">
            Material
          </Label>
          <SelectField
            name="packaging_material_id"
            defaultValue=""
            id="item-material"
            className="mt-1 h-10 w-full bg-white"
          >
            <option value="" disabled>
              Pilih material
            </option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {materialOptionLabel(material.name, material.usage_unit_name)}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <Label htmlFor="item-usage" className="text-sm font-medium">
            Pemakaian default
          </Label>
          <Input
            id="item-usage"
            name="default_usage_qty"
            type="number"
            min="0.0001"
            step="0.0001"
            required
            className="mt-1 h-10 bg-white"
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
        <Table className="min-w-full divide-y divide-slate-200">
          <TableHeader>
            <TableRow className="hover:bg-teal-50/40">
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Material</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Konversi</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stok</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Biaya rata-rata</TableHead>
              <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {materials.map((material) => (
              <TableRow key={material.id} className="hover:bg-teal-50/40">
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <p className="font-medium">{material.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Beli per {material.purchase_unit_name} · Pakai per{" "}
                      {material.usage_unit_name}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {formatNumber(material.conversion_factor, 4)}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <p>{formatNumber(material.stock_qty, 4)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Min.{" "}
                      {material.min_stock === null
                        ? "-"
                        : formatNumber(material.min_stock, 4)}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {formatRupiah(material.average_unit_cost)}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <ToggleForm
                      action={toggleMaterialActiveAction}
                      id={material.id}
                      active={material.is_active}
                    />
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel
        title="Daftar Ukuran Paket"
        description="Estimasi HPP dihitung dari pemakaian default dikali biaya rata-rata material."
      >
        {sizes.length === 0 ? (
          <p className="text-sm text-slate-600">Belum ada ukuran paket.</p>
        ) : (
          <div className="space-y-4">
            {sizes.map((size) => (
              <div
                key={size.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{size.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {size.dimension_label || "Tanpa label dimensi"} · Urutan{" "}
                      {size.sort_order}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold text-slate-900">
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
                      <span className="text-xs text-slate-500">
                        Dipakai {size.sales_count} transaksi
                      </span>
                    )}
                  </div>
                </div>

                <Table className="mt-4 min-w-full divide-y divide-slate-200">
                  <TableHeader>
                    <TableRow className="hover:bg-teal-50/40">
                      <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Material</TableHead>
                      <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pemakaian</TableHead>
                      <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Biaya</TableHead>
                      <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</TableHead>
                      <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {size.items.length === 0 ? (
                      <TableRow className="hover:bg-teal-50/40">
                        <TableCell className="px-3 py-3 align-top text-sm text-slate-800" colSpan={5}>
                          Belum ada komposisi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      size.items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-teal-50/40">
                          <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{item.material_name}</TableCell>
                          <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                            {formatNumber(item.default_usage_qty, 4)}
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                            {formatRupiah(item.unit_cost)}
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                            {formatRupiah(item.subtotal)}
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                            <CompactActionForm
                              action={deletePackageItemAction}
                              submitLabel="Hapus"
                              buttonClassName="rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
                            >
                              <input type="hidden" name="id" value={item.id} />
                            </CompactActionForm>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
