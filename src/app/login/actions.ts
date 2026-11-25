"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { createUserSession, destroyUserSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi").max(64),
  password: z.string().min(1, "Password wajib diisi").max(128),
});

const INVALID_CREDENTIALS = "Username atau password tidak valid.";

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
      username: formData.get("username"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS };
    }

    const { username, password } = parsed.data;

    const user = await prisma.users.findUnique({ where: { username } });
    if (!user || !user.is_active) {
      return { error: INVALID_CREDENTIALS };
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return { error: INVALID_CREDENTIALS };
    }

    await createUserSession(user.id);
    sessionCreated = true;
  } catch (error) {
    return { error: getErrorMessage(error) };
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
    return { error: getErrorMessage(error) };
  }
  redirect("/login");
}
