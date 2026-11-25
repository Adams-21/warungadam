export const DEFAULT_PACKAGE_COUNT = 1;

export function resolvePackageCount(
  value: string | number | null | undefined,
): number {
  if (value === "" || value === null || value === undefined) {
    return DEFAULT_PACKAGE_COUNT;
  }
  return typeof value === "number" ? value : Number(value);
}
