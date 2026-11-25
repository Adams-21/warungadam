"use client";

import {
  Button,
  DateRangeFields,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  primaryButtonClass,
} from "@/components/ui";
import { useState } from "react";

export function DashboardFilter({
  from,
  to,
  granularity,
}: {
  from: string;
  to: string;
  granularity: "daily" | "monthly";
}) {
  const [view, setView] = useState<"daily" | "monthly">(granularity);

  return (
    <form method="get" className="grid gap-4 md:grid-cols-4">
      <DateRangeFields
        from={from}
        to={to}
        fromLabel="Dari"
        toLabel="Sampai"
        className="md:col-span-2"
      />
      <div>
        <Label htmlFor="granularity" className="text-sm font-medium text-slate-700">
          Tampilan Tren
        </Label>
        <input type="hidden" name="granularity" value={view} />
        <Select
          value={view}
          onValueChange={(value) => setView(value === "monthly" ? "monthly" : "daily")}
        >
          <SelectTrigger id="granularity" className="mt-1 h-10 w-full bg-white">
            <SelectValue placeholder="Pilih tampilan">
              {view === "monthly" ? "Bulanan" : "Harian"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Harian</SelectItem>
            <SelectItem value="monthly">Bulanan</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button type="submit" className={`${primaryButtonClass} w-full`}>
          Terapkan Filter
        </Button>
      </div>
    </form>
  );
}
