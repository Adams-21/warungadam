import { buildDateBounds } from "@/lib/date-range";

export type ExpenseDateBounds = {
  gte?: Date;
  lte?: Date;
};

export type ExpenseDateFilter = {
  bounds: ExpenseDateBounds | null;
  from: Date;
  to: Date;
  error: string | null;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function resolveExpenseDateFilter(
  rawFrom: string,
  rawTo: string,
  fallback: { from: Date; to: Date },
): ExpenseDateFilter {
  const fromInput = (rawFrom ?? "").trim();
  const toInput = (rawTo ?? "").trim();
  const fallbackFrom = startOfDay(fallback.from);
  const fallbackTo = startOfDay(fallback.to);

  if (!fromInput && !toInput) {
    return {
      bounds: { gte: fallbackFrom, lte: endOfDay(fallbackTo) },
      from: fallbackFrom,
      to: fallbackTo,
      error: null,
    };
  }

  const bounds = buildDateBounds(fromInput, toInput);
  if (!bounds) {
    return {
      bounds: null,
      from: fallbackFrom,
      to: fallbackTo,
      error: "Rentang tanggal tidak valid.",
    };
  }

  const gte = bounds.gte ?? fallbackFrom;
  const lte = bounds.lte ?? endOfDay(fallbackTo);
  return {
    bounds: { gte, lte },
    from: startOfDay(gte),
    to: startOfDay(lte),
    error: null,
  };
}
