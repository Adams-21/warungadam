export type DateRangePreset = "today" | "last7" | "thisMonth";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseStrictDateInput(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function resolveDateRangePreset(
  preset: DateRangePreset,
  now: Date = new Date(),
): { from: string; to: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = toDateInputValue(today);

  if (preset === "last7") {
    return {
      from: toDateInputValue(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
      ),
      to,
    };
  }

  if (preset === "thisMonth") {
    return {
      from: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
      to,
    };
  }

  return { from: to, to };
}

export function buildDateBounds(
  fromValue: string,
  toValue: string,
): { gte?: Date; lte?: Date } | null {
  const from = fromValue ? parseStrictDateInput(fromValue) : null;
  const to = toValue ? parseStrictDateInput(toValue) : null;
  if (fromValue && !from) return null;
  if (toValue && !to) return null;
  if (!from && !to) return null;

  const start = from && to ? (from <= to ? from : to) : from ?? to;
  const end = from && to ? (from <= to ? to : from) : from ?? to;

  if (!start || !end) return null;

  return {
    ...(start
      ? { gte: new Date(start.getFullYear(), start.getMonth(), start.getDate()) }
      : {}),
    ...(end
      ? {
          lte: new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate(),
            23,
            59,
            59,
            999,
          ),
        }
      : {}),
  };
}
