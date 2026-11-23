import { logoutAction } from "@/app/login/actions";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SidebarNav } from "./sidebar-nav";

export const instant = false;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const settings = await prisma.businessSettings.findFirst({
    orderBy: { updated_at: "desc" },
    select: { business_name: true },
  });

  return (
    <SidebarNav
      businessName={settings?.business_name ?? "BizManage"}
      username={user.username}
      role={user.role}
      logoutAction={logoutAction}
    >
      {children}
    </SidebarNav>
  );
}
