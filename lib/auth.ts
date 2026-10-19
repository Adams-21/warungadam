import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const SESSION_COOKIE = "warungadam_session";
const PIN_COOKIE = "warungadam_pin";
const SECRET = process.env.AUTH_SECRET ?? "warungadam-dev-secret-change-me";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function sign(value: string) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(candidate, "hex");

  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(PIN_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [userId, signature] = token.split(".");
  if (!userId || !signature || sign(userId) !== signature) return null;

  return db.user.findUnique({ where: { id: userId } });
}

export async function markPinVerified(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(PIN_COOKIE, sign(`pin:${userId}`), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function isPinVerified(userId: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(PIN_COOKIE)?.value;
  return !!value && value === sign(`pin:${userId}`);
}
