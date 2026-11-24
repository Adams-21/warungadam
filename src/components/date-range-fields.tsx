"use client";

import {
  resolveDateRangePreset,
  toDateInputValue,
  type DateRangePreset,
} from "@/lib/date-range";
import { useRef } from "react";

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900";

const presetButtonClass =
  "rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 sm:px-3 sm:text-sm";

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
  fromLabel = "Dari Tanggal",
  toLabel = "Sampai Tanggal",
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
          <label htmlFor={fromName} className="text-sm font-medium">
            {fromLabel}
          </label>
          <input
            id={fromName}
            name={fromName}
            type="date"
            defaultValue={from}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={toName} className="text-sm font-medium">
            {toLabel}
          </label>
          <input
            id={toName}
            name={toName}
            type="date"
            defaultValue={to}
            className={inputClass}
          />
        </div>
      </div>
      {showPresets ? (
        <div className="flex flex-wrap gap-2">
          {presets.map((item) => (
            <button
              key={item.preset}
              type="button"
              onClick={() => applyPreset(item.preset)}
              className={presetButtonClass}
            >
              {item.label}
            </button>
          ))}
          <span className="self-center text-xs text-zinc-500">
            Pintasan: {toDateInputValue(new Date())}
          </span>
        </div>
      ) : null}
    </div>
  );
}
