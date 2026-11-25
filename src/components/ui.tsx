import type { ActionState } from "@/lib/action-state";
import { cn } from "cn";
import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button, buttonVariants } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export { DateRangeFields } from "./date-range-fields";

export const inputClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-teal-600 focus-visible:ring-2 focus-visible:ring-teal-600/20 tabular-nums";

export const primaryButtonClass = cn(
  buttonVariants({ variant: "default" }),
  "h-10 rounded-lg px-4 shadow-sm",
);

export const secondaryButtonClass = cn(
  buttonVariants({ variant: "outline" }),
  "h-9 rounded-lg border-slate-200 px-3 text-slate-700 shadow-sm",
);

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

const statusToneClasses: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

export function resolveStatusTone(status: string): StatusTone {
  const value = status.toUpperCase().replace(/[\s-]+/g, "_");
  if (
    /PAID|COMPLETED|ACTIVE|LUNAS|DIBAYAR|SELESAI|DITERIMA_SELURUHNYA|SUDAH_CAIR|DANA_DIKEMBALIKAN|DISETUJUI|AKTIF/.test(
      value,
    )
  ) {
    return "success";
  }
  if (
    /PARTIAL|LOW_STOCK|SEBAGIAN|DITERIMA_SEBAGIAN|MENUNGGU|DALAM_PROSES|BELUM_DAPAT_DIPASTIKAN|MENIPIS|SEDIKIT/.test(
      value,
    )
  ) {
    return "warning";
  }
  if (
    /UNPAID|VOID|EXPIRED|DIBATALKAN|DITOLAK|BELUM_DIBAYAR|KEDALUWARSA/.test(
      value,
    )
  ) {
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
    <Badge
      variant="outline"
      className={statusToneClasses[tone ?? resolveStatusTone(status)]}
    >
      {children ?? status}
    </Badge>
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
      ? "text-slate-900"
      : tone === "success"
        ? "text-emerald-700"
        : tone === "danger"
          ? "text-rose-700"
          : tone === "warning"
            ? "text-amber-700"
            : tone === "info"
              ? "text-sky-700"
              : "text-slate-900";

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-600">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          data-slot="stat-value"
          className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${valueTone}`}
        >
          {value}
        </p>
        {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
      </CardContent>
    </Card>
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
    <Card
      className={`border-dashed border-slate-200 bg-slate-50/60 text-center shadow-none ${
        compact ? "gap-2 py-4" : "gap-2 py-8"
      }`}
    >
      <CardContent>
        <p className="text-sm font-medium text-slate-800">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </CardContent>
    </Card>
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
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
    <Card className={cn("border-slate-200/80 bg-white shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-sm text-slate-600">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="mt-4">{children}</CardContent>
    </Card>
  );
}

export function ActionMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <Alert variant="destructive" className="mt-3 border-rose-200 bg-rose-50 text-rose-700">
        <AlertTitle className="text-sm font-medium">Gagal</AlertTitle>
        <AlertDescription className="text-rose-700">{state.error}</AlertDescription>
      </Alert>
    );
  }

  if (state.success) {
    return (
      <Alert className="mt-3 border-emerald-200 bg-emerald-50 text-emerald-700">
        <AlertTitle className="text-sm font-medium">Berhasil</AlertTitle>
        <AlertDescription className="text-emerald-700">{state.success}</AlertDescription>
      </Alert>
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
    <Button type="submit" className={className} disabled={pending}>
      {pending ? "Menyimpan..." : children}
    </Button>
  );
}

export {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
};
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
export { Input } from "./ui/input";
export { Label } from "./ui/label";
export { Separator } from "./ui/separator";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
