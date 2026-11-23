import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "bizmanage_session";

const PASSWORD_SALT_ROUNDS = 12;
const DEFAULT_SESSION_TIMEOUT_MINUTES = 60;

export type CurrentUser = {
  id: string;
  username: string;
  role: UserRole;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

async function getActiveSession() {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await prisma.sessions.findUnique({
    where: { token_hash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expires_at.getTime() <= Date.now()) return null;
  if (!session.user.is_active) return null;

  return session;
}

export async function createUserSession(userId: string): Promise<void> {
  const settings = await prisma.businessSettings.findFirst({
    orderBy: { updated_at: "desc" },
    select: { session_timeout_minutes: true },
  });

  const configuredTimeout = settings?.session_timeout_minutes ?? 0;
  const timeoutMinutes =
    configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_SESSION_TIMEOUT_MINUTES;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60_000);

  await prisma.$transaction(async (tx) => {
    const session = await tx.sessions.create({
      data: {
        user_id: userId,
        token_hash: hashToken(token),
        expires_at: expiresAt,
      },
    });

    await tx.activityLogs.create({
      data: {
        entity_type: "Sessions",
        entity_id: session.id,
        action: "LOGIN",
        created_by_id: userId,
      },
    });
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: timeoutMinutes * 60,
  });
}

export const getCurrentUser = cache(
  async (): Promise<CurrentUser | null> => {
    const session = await getActiveSession();
    if (!session) return null;

    return {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
    };
  },
);

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getCurrentSessionId(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await prisma.sessions.findUnique({
    where: { token_hash: hashToken(token) },
    select: { id: true },
  });

  return session?.id ?? null;
}

export async function destroyUserSession(): Promise<void> {
  const token = await getSessionToken();
  if (!token) return;

  const tokenHash = hashToken(token);
  const session = await prisma.sessions.findUnique({
    where: { token_hash: tokenHash },
    select: { id: true, user_id: true },
  });

  if (session) {
    await prisma.$transaction([
      prisma.activityLogs.create({
        data: {
          entity_type: "Sessions",
          entity_id: session.id,
          action: "LOGOUT",
          created_by_id: session.user_id,
        },
      }),
      prisma.sessions.deleteMany({ where: { token_hash: tokenHash } }),
    ]);
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
