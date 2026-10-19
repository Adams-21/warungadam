"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ActionState } from "./action-state";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  markPinVerified,
  verifyPassword,
} from "@/lib/auth";

export async function registerStore(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const storeName = String(formData.get("storeName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!storeName) {
    return { success: false, message: "Nama toko wajib diisi." };
  }
  if (!username) {
    return { success: false, message: "Username wajib diisi." };
  }
  if (username.length < 3) {
    return { success: false, message: "Username minimal 3 karakter." };
  }
  if (password.length < 4) {
    return { success: false, message: "Password minimal 4 karakter." };
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    return { success: false, message: "Username sudah dipakai. Coba yang lain." };
  }

  const user = await db.user.create({
    data: {
      storeName,
      username,
      password: hashPassword(password),
    },
  });

  await createSession(user.id);
  revalidatePath("/");
  redirect("/");
}

export async function loginStore(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { success: false, message: "Username dan password wajib diisi." };
  }

  const user = await db.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.password)) {
    return { success: false, message: "Username atau password salah." };
  }

  await createSession(user.id);
  revalidatePath("/");
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function verifyPin(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Sesi berakhir. Silakan login ulang." };
  }

  const pin = String(formData.get("pin") ?? "").trim();
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, message: "PIN harus 4 digit angka." };
  }

  const expected = Buffer.from(user.pin);
  const actual = Buffer.from(pin);
  const isMatch =
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual);

  if (!isMatch) {
    return { success: false, message: "PIN Salah!" };
  }

  await markPinVerified(user.id);
  revalidatePath("/");
  revalidatePath("/products");
  return { success: true, message: "PIN benar. Membuka halaman..." };
}
