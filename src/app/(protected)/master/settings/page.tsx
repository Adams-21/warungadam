import { PageHeading } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { SettingsManager } from "./settings-manager";
import type {
  BusinessSettingsView,
  ChannelView,
  ExpenseCategoryView,
} from "./types";

export const instant = false;

export default async function SettingsPage() {
  const [settings, channels, expenseCategories] = await Promise.all([
    prisma.businessSettings.findFirst({
      orderBy: { updated_at: "desc" },
    }),
    prisma.salesChannels.findMany({ orderBy: { name: "asc" } }),
    prisma.expenseCategories.findMany({ orderBy: { name: "asc" } }),
  ]);

  const settingsView: BusinessSettingsView = {
    id: settings?.id ?? "",
    business_name: settings?.business_name ?? "BizManage",
    address: settings?.address ?? "",
    phone: settings?.phone ?? "",
    default_admin_fee_rate: settings?.default_admin_fee_rate.toNumber() ?? 22,
    session_timeout_minutes: settings?.session_timeout_minutes ?? 60,
  };

  const channelViews: ChannelView[] = channels;
  const expenseCategoryViews: ExpenseCategoryView[] = expenseCategories;

  return (
    <>
      <PageHeading
        title="Pengaturan Bisnis"
        description="Atur identitas bisnis, kanal penjualan, dan kategori pengeluaran."
      />
      <SettingsManager
        settings={settingsView}
        channels={channelViews}
        expenseCategories={expenseCategoryViews}
      />
    </>
  );
}
