"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { verifyPassword, createUserSession, destroyUserSession } from "@/lib/auth";
import { isRedirectError } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/schemas/auth";
import {
  getValidationMessage,
  INVALID_CREDENTIALS_MESSAGE,
  LOGOUT_FAILED_MESSAGE,
  LOGIN_UNAVAILABLE_MESSAGE,
  toLoginFieldValue,
} from "./login-rules";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  let sessionCreated = false;

  try {
    const parsed = loginSchema.safeParse({
      username: toLoginFieldValue(formData.get("username")),
      password: toLoginFieldValue(formData.get("password")),
    });

    if (!parsed.success) {
      return { error: getValidationMessage(parsed.error.issues) };
    }

    const { username, password } = parsed.data;

    const user = await prisma.users.findUnique({ where: { username } });
    if (!user || !user.is_active) {
      return { error: INVALID_CREDENTIALS_MESSAGE };
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);
    if (!passwordMatches) {
      return { error: INVALID_CREDENTIALS_MESSAGE };
    }

    await createUserSession(user.id);
    sessionCreated = true;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: LOGIN_UNAVAILABLE_MESSAGE };
  }

  if (sessionCreated) {
    redirect("/dashboard");
  }

  return {};
}

export async function logoutAction(): Promise<ActionState> {
  try {
    await destroyUserSession();
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: LOGOUT_FAILED_MESSAGE };
  }
  redirect("/login");
}
