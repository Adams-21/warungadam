"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createUserSession, destroyUserSession } from "@/lib/auth";
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
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyUserSession();
  redirect("/login");
}
