export function materialOptionLabel(
  name: string,
  unitName?: string | null,
): string {
  const trimmedUnit = unitName?.trim() ?? "";
  return trimmedUnit ? `${name} — ${trimmedUnit}` : name;
}
