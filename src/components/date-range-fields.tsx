"use client";

import { Button, Input, Label, secondaryButtonClass } from "@/components/ui";
import {
  resolveDateRangePreset,
  toDateInputValue,
  type DateRangePreset,
} from "@/lib/date-range";
import { useRef } from "react";

const presets: { label: string; preset: DateRangePreset }[] = [
  { label: "Hari Ini", preset: "today" },
  { label: "7 Hari Terakhir", preset: "last7" },
  { label: "Bulan Ini", preset: "thisMonth" },
];

export function DateRangeFields({
  from,
  to,
  fromName = "date_from",
  toName = "date_to",
  fromLabel = "Dari",
  toLabel = "Sampai",
  showPresets = true,
  className = "",
}: {
  from: string;
  to: string;
  fromName?: string;
  toName?: string;
  fromLabel?: string;
  toLabel?: string;
  showPresets?: boolean;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  function applyPreset(preset: DateRangePreset) {
    const range = resolveDateRangePreset(preset);
    const form = wrapperRef.current?.closest("form");
    const fromInput = form?.elements.namedItem(fromName) as HTMLInputElement | null;
    const toInput = form?.elements.namedItem(toName) as HTMLInputElement | null;
    if (fromInput) fromInput.value = range.from;
    if (toInput) toInput.value = range.to;
    form?.requestSubmit();
  }

  return (
    <div ref={wrapperRef} className={`space-y-3 ${className}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={fromName} className="text-sm font-medium text-slate-700">
            {fromLabel}
          </Label>
          <Input
            id={fromName}
            name={fromName}
            type="date"
            defaultValue={from}
            className="mt-1 h-10 bg-white"
          />
        </div>
        <div>
          <Label htmlFor={toName} className="text-sm font-medium text-slate-700">
            {toLabel}
          </Label>
          <Input
            id={toName}
            name={toName}
            type="date"
            defaultValue={to}
            className="mt-1 h-10 bg-white"
          />
        </div>
      </div>
      {showPresets ? (
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((item) => (
            <Button
              key={item.preset}
              type="button"
              variant="outline"
              onClick={() => applyPreset(item.preset)}
              className={`${secondaryButtonClass} h-9 text-xs sm:text-sm`}
            >
              {item.label}
            </Button>
          ))}
          <span className="self-center text-xs text-slate-500">
            Pintasan: {toDateInputValue(new Date())}
          </span>
        </div>
      ) : null}
    </div>
  );
}
