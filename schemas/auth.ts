import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username wajib diisi")
    .max(64, "Username terlalu panjang"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .max(128, "Password terlalu panjang"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Password saat ini wajib diisi")
      .max(128, "Password terlalu panjang"),
    newPassword: z
      .string()
      .min(6, "Password baru minimal 6 karakter")
      .max(128, "Password terlalu panjang"),
    confirmPassword: z
      .string()
      .min(1, "Konfirmasi password wajib diisi")
      .max(128, "Password terlalu panjang"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
