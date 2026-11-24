"use client";

import {
  DateRangeFields,
  inputClass,
  primaryButtonClass,
} from "@/components/ui";

export function DashboardFilter({
  from,
  to,
  granularity,
}: {
  from: string;
  to: string;
  granularity: "daily" | "monthly";
}) {
  return (
    <form method="get" className="grid gap-4 md:grid-cols-4">
      <DateRangeFields
        from={from}
        to={to}
        fromLabel="Dari Tanggal"
        toLabel="Sampai Tanggal"
        className="md:col-span-2"
      />
      <div>
        <label htmlFor="granularity" className="text-sm font-medium">
          Tampilan Tren
        </label>
        <select
          id="granularity"
          name="granularity"
          defaultValue={granularity}
          className={inputClass}
        >
          <option value="daily">Harian</option>
          <option value="monthly">Bulanan</option>
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" className={`${primaryButtonClass} w-full`}>
          Terapkan Filter
        </button>
      </div>
    </form>
  );
}
