"use client";

import { useActionState } from "react";
import {
  ActionMessage,
  Panel,
  SubmitButton,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/action-state";
import { formatNumber } from "@/lib/format";
import {
  createExpenseCategoryAction,
  createSalesChannelAction,
  toggleExpenseCategoryActiveAction,
  toggleSalesChannelActiveAction,
  updateBusinessSettingsAction,
} from "./actions";
import type {
  BusinessSettingsView,
  ChannelView,
  ExpenseCategoryView,
} from "./types";

const thClass =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
const tdClass = "px-3 py-2 align-top text-sm text-zinc-800";

function ToggleForm({
  action,
  id,
  active,
}: {
  action: (formData: FormData) => Promise<void>;
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

function BusinessSettingsForm({
  settings,
}: {
  settings: BusinessSettingsView;
}) {
  const [state, formAction, pending] = useActionState(
    updateBusinessSettingsAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Identitas & Preferensi Bisnis"
      description="Nama bisnis tampil di header, sedangkan rate admin dipakai saat transaksi."
    >
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={settings.id} />
        <div>
          <label htmlFor="settings-name" className="text-sm font-medium">
            Nama bisnis
          </label>
          <input
            id="settings-name"
            name="business_name"
            required
            defaultValue={settings.business_name}
            className={inputClass}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-address" className="text-sm font-medium">
              Alamat
            </label>
            <textarea
              id="settings-address"
              name="address"
              rows={2}
              defaultValue={settings.address}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-phone" className="text-sm font-medium">
              Telepon
            </label>
            <input
              id="settings-phone"
              name="phone"
              defaultValue={settings.phone}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-rate" className="text-sm font-medium">
              Rate admin default (%)
            </label>
            <input
              id="settings-rate"
              name="default_admin_fee_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              defaultValue={settings.default_admin_fee_rate}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settings-timeout" className="text-sm font-medium">
              Timeout sesi (menit)
            </label>
            <input
              id="settings-timeout"
              name="session_timeout_minutes"
              type="number"
              min="1"
              max="1440"
              step="1"
              required
              defaultValue={settings.session_timeout_minutes}
              className={inputClass}
            />
          </div>
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Simpan Pengaturan</SubmitButton>
      </form>
    </Panel>
  );
}

function SalesChannelForm() {
  const [state, formAction, pending] = useActionState(
    createSalesChannelAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Tambah Kanal Penjualan"
      description="Kanal bisa berupa toko fisik atau marketplace."
    >
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="channel-name" className="text-sm font-medium">
            Nama kanal
          </label>
          <input
            id="channel-name"
            name="name"
            required
            className={inputClass}
            placeholder="Contoh: Toko Pusat"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            name="is_marketplace"
            className="h-4 w-4 rounded border-zinc-300"
          />
          Marketplace
        </label>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Kanal</SubmitButton>
      </form>
    </Panel>
  );
}

function ExpenseCategoryForm() {
  const [state, formAction, pending] = useActionState(
    createExpenseCategoryAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <Panel
      title="Tambah Kategori Pengeluaran"
      description="Kategori dipakai saat mencatat pengeluaran operasional."
    >
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="expense-category-name" className="text-sm font-medium">
            Nama kategori
          </label>
          <input
            id="expense-category-name"
            name="name"
            required
            className={inputClass}
            placeholder="Contoh: Listrik"
          />
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Tambah Kategori</SubmitButton>
      </form>
    </Panel>
  );
}

export function SettingsManager({
  settings,
  channels,
  expenseCategories,
}: {
  settings: BusinessSettingsView;
  channels: ChannelView[];
  expenseCategories: ExpenseCategoryView[];
}) {
  return (
    <div className="space-y-6">
      <BusinessSettingsForm settings={settings} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesChannelForm />
        <ExpenseCategoryForm />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Daftar Kanal Penjualan"
          description={`${channels.length} kanal terdaftar.`}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead>
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Jenis</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {channels.map((channel) => (
                  <tr key={channel.id}>
                    <td className={tdClass}>{channel.name}</td>
                    <td className={tdClass}>
                      {channel.is_marketplace ? "Marketplace" : "Toko"}
                    </td>
                    <td className={tdClass}>
                      <ToggleForm
                        action={toggleSalesChannelActiveAction}
                        id={channel.id}
                        active={channel.is_active}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Daftar Kategori Pengeluaran"
          description={`${expenseCategories.length} kategori terdaftar.`}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead>
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {expenseCategories.map((category) => (
                  <tr key={category.id}>
                    <td className={tdClass}>{category.name}</td>
                    <td className={tdClass}>
                      <ToggleForm
                        action={toggleExpenseCategoryActiveAction}
                        id={category.id}
                        active={category.is_active}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <p className="text-sm text-zinc-600">
        Rate admin saat ini: {formatNumber(settings.default_admin_fee_rate, 2)}%
      </p>
    </div>
  );
}
