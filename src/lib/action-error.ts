import "server-only";

import type { ActionState } from "@/lib/action-state";
import {
  GENERIC_ERROR_MESSAGE,
  getErrorMessage,
} from "@/lib/error-handler";

export class ActionError extends Error {}

export function toActionError(error: unknown, fallback: string): ActionState {
  const message = getErrorMessage(error);
  return { error: message === GENERIC_ERROR_MESSAGE ? fallback : message };
}
