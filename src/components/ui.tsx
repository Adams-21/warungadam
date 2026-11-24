import type { ActionState } from "@/lib/action-state";
import type { ReactNode } from "react";

export { DateRangeFields } from "./date-range-fields";

export const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

const statusToneClasses: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function resolveStatusTone(status: string): StatusTone {
  const value = status.toUpperCase().replace(/[\s-]+/g, "_");
  if (
    /PAID|COMPLETED|LUNAS|DIBAYAR|SELESAI|DITERIMA_SELURUHNYA|SUDAH_CAIR|DANA_DIKEMBALIKAN|DISETUJUI|AKTIF/.test(
      value,
    )
  ) {
    return "success";
  }
  if (
    /PARTIAL|SEBAGIAN|DITERIMA_SEBAGIAN|MENUNGGU|DALAM_PROSES|BELUM_DAPAT_DIPASTIKAN/.test(
      value,
    )
  ) {
    return "warning";
  }
  if (/VOID|DIBATALKAN|DITOLAK|UNPAID|BELUM_DIBAYAR/.test(value)) {
    return "danger";
  }
  if (/BARU|DRAF|BELUM_CAIR|BELUM_DIPROSES|BELUM_DIAJUKAN/.test(value)) {
    return "neutral";
  }
  return "info";
}

export function StatusBadge({
  status,
  children,
  tone,
}: {
  status: string;
  children?: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusToneClasses[tone ?? resolveStatusTone(status)]}`}
    >
      {children ?? status}
    </span>
  );
}

export function StatCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | StatusTone;
}) {
  const valueTone =
    tone === "default"
      ? "text-zinc-900"
      : tone === "success"
        ? "text-emerald-700"
        : tone === "danger"
          ? "text-red-600"
          : tone === "warning"
            ? "text-amber-700"
            : tone === "info"
              ? "text-blue-700"
              : "text-zinc-900";

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-600">{label}</p>
      <p className={`mt-2 text-xl font-semibold tracking-tight ${valueTone}`}>{value}</p>
      {note ? <p className="mt-1 text-xs text-zinc-500">{note}</p> : null}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-dashed border-zinc-300 bg-zinc-50/40 text-center ${
        compact ? "p-4" : "p-8"
      }`}
    >
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">{description}</p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}
    >
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ActionMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="text-sm text-green-700" role="status">
        {state.success}
      </p>
    );
  }

  return null;
}

export function SubmitButton({
  pending,
  children,
  className = primaryButtonClass,
}: {
  pending: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Menyimpan..." : children}
    </button>
  );
}
