export const DEFAULT_SALES_CHANNEL_NAME = "Toko Offline";

export function resolveDefaultSalesChannel<
  T extends { id: string; name: string; is_marketplace?: boolean },
>(channels: readonly T[]): T | null {
  return (
    channels.find(
      (channel) =>
        channel.name === DEFAULT_SALES_CHANNEL_NAME &&
        !channel.is_marketplace,
    ) ??
    channels.find((channel) => !channel.is_marketplace) ??
    channels[0] ??
    null
  );
}

export function resolveDefaultSalesChannelId<
  T extends { id: string; name: string; is_marketplace?: boolean },
>(channels: readonly T[]): string {
  return resolveDefaultSalesChannel(channels)?.id ?? "";
}
