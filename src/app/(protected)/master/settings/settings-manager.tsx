"use client";

import { useActionState, useState } from "react";
import {
  ActionMessage,
  Badge,
  Input,
  Label,
  Panel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SubmitButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  inputClass,
} from "@/components/ui";
import { CompactActionForm } from "@/components/compact-action-form";
import { EMPTY_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { formatNumber } from "@/lib/format";
import { isPresetSessionTimeout, sessionTimeoutLabel } from "./settings-helpers";
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

function ToggleForm({
  action,
  id,
  active,
}: {
  action: (formData: FormData) => Promise<ActionState>;
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

function BusinessSettingsForm({
  settings,
}: {
  settings: BusinessSettingsView;
}) {
  const [state, formAction, pending] = useActionState(
    updateBusinessSettingsAction,
    EMPTY_ACTION_STATE,
  );
  const [timeout, setTimeout] = useState(
    String(settings.session_timeout_minutes),
  );
  const hasCustomTimeout = !isPresetSessionTimeout(timeout);
  const timeoutLabel = hasCustomTimeout
    ? `${sessionTimeoutLabel(timeout)} (saat ini)`
    : sessionTimeoutLabel(timeout);

  return (
    <Panel
      title="Identitas & Preferensi Bisnis"
      description="Nama bisnis tampil di header, sedangkan rate admin dipakai saat transaksi."
    >
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={settings.id} />
        <div>
          <Label htmlFor="settings-name" className="text-sm font-medium">
            Nama bisnis
          </Label>
          <Input
            id="settings-name"
            name="business_name"
            required
            defaultValue={settings.business_name}
            className="mt-1 h-10 bg-white"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="settings-address" className="text-sm font-medium">
              Alamat
            </Label>
            <textarea
              id="settings-address"
              name="address"
              rows={2}
              defaultValue={settings.address}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="settings-phone" className="text-sm font-medium">
              Telepon
            </Label>
            <Input
              id="settings-phone"
              name="phone"
              defaultValue={settings.phone}
              className="mt-1 h-10 bg-white"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="settings-rate" className="text-sm font-medium">
              Rate admin default (%)
            </Label>
            <Input
              id="settings-rate"
              name="default_admin_fee_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              defaultValue={settings.default_admin_fee_rate}
              className="mt-1 h-10 bg-white"
            />
          </div>
          <div>
            <Label htmlFor="settings-timeout" className="text-sm font-medium">
              Timeout sesi
            </Label>
            <input type="hidden" name="session_timeout_minutes" value={timeout} />
            <Select
              value={timeout}
              onValueChange={(value) => setTimeout(value ?? "15")}
            >
              <SelectTrigger
                id="settings-timeout"
                className="mt-1 h-10 w-full bg-white"
              >
                <SelectValue placeholder="Pilih timeout sesi">
                  {timeoutLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 Menit</SelectItem>
                <SelectItem value="30">30 Menit</SelectItem>
                <SelectItem value="60">1 Jam</SelectItem>
                <SelectItem value="120">Maksimal 2 Jam</SelectItem>
                {hasCustomTimeout ? (
                  <SelectItem value={timeout}>{timeoutLabel}</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
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
          <Label htmlFor="channel-name" className="text-sm font-medium">
            Nama kanal
          </Label>
          <Input
            id="channel-name"
            name="name"
            required
            className="mt-1 h-10 bg-white"
            placeholder="Contoh: Toko Pusat"
          />
        </div>
        <Label className="flex items-center gap-2 text-sm text-slate-800">
          <Input
            type="checkbox"
            name="is_marketplace"
            className="h-4 w-4 rounded border-slate-300"
          />
          Marketplace
        </Label>
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
          <Label htmlFor="expense-category-name" className="text-sm font-medium">
            Nama kategori
          </Label>
          <Input
            id="expense-category-name"
            name="name"
            required
            className="mt-1 h-10 bg-white"
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
          <Table className="min-w-full divide-y divide-slate-200">
            <TableHeader>
              <TableRow className="hover:bg-teal-50/40">
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Jenis</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {channels.map((channel) => (
                <TableRow key={channel.id} className="hover:bg-teal-50/40">
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{channel.name}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    {channel.is_marketplace ? "Marketplace" : "Toko"}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={
                          channel.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }
                      >
                        {channel.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                      <ToggleForm
                        action={toggleSalesChannelActiveAction}
                        id={channel.id}
                        active={channel.is_active}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel
          title="Daftar Kategori Pengeluaran"
          description={`${expenseCategories.length} kategori terdaftar.`}
        >
          <Table className="min-w-full divide-y divide-slate-200">
            <TableHeader>
              <TableRow className="hover:bg-teal-50/40">
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</TableHead>
                <TableHead className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {expenseCategories.map((category) => (
                <TableRow key={category.id} className="hover:bg-teal-50/40">
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">{category.name}</TableCell>
                  <TableCell className="px-3 py-3 align-top text-sm text-slate-800">
                    <ToggleForm
                      action={toggleExpenseCategoryActiveAction}
                      id={category.id}
                      active={category.is_active}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>

      <p className="text-sm text-slate-600">
        Rate admin saat ini: {formatNumber(settings.default_admin_fee_rate, 2)}%
      </p>
    </div>
  );
}
