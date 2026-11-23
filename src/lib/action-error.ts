import "server-only";

import { Prisma } from "@prisma/client";
import type { ActionState } from "@/lib/action-state";

export class ActionError extends Error {}

export function toActionError(error: unknown, fallback: string): ActionState {
  if (error instanceof ActionError) {
    return { error: error.message };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { error: "Nilai tersebut sudah digunakan data lain." };
    }
    if (error.code === "P2003") {
      return { error: "Data referensi tidak ditemukan atau masih digunakan." };
    }
  }

  console.error(error);
  return { error: fallback };
}
