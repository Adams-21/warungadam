import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

type ActivityClient = Prisma.TransactionClient | PrismaClient;

type ActivityDetails = Record<string, string | number | boolean | null>;

export async function logActivity(
  client: ActivityClient,
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  details?: ActivityDetails,
): Promise<void> {
  await client.activityLogs.create({
    data: {
      entity_type: entityType,
      entity_id: entityId,
      action,
      created_by_id: userId,
      details: details as Prisma.InputJsonValue | undefined,
    },
  });
}
