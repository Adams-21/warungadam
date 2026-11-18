"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getSessionCookieValue,
  setSessionCookie,
} from "@/lib/auth/session";
import { loginSchema } from "@/schemas/auth";

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
    return { error: "Username atau password tidak valid." };
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !user.isActive || user.role !== "PENGELOLA") {
    return { error: "Username atau password tidak valid." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "Username atau password tidak valid." };
  }

  const sessionId = await createSession(user.id);
  await setSessionCookie(sessionId);

  redirect("/dashboard");
}

export async function logoutAction() {
  const sessionId = await getSessionCookieValue();
  if (sessionId) {
    await deleteSession(sessionId);
  }
  await clearSessionCookie();
  redirect("/login");
}
