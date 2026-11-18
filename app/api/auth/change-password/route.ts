import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser, getSessionCookieValue } from "@/lib/auth/session";
import { changePasswordSchema } from "@/schemas/auth";

export async function POST(request: Request) {
  const currentSessionId = await getSessionCookieValue();
  const user = await getCurrentUser();
  if (!user || !currentSessionId) {
    return Response.json(
      { error: "Sesi tidak valid. Silakan login kembali." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return Response.json(
        { error: "Sesi tidak valid. Silakan login kembali." },
        { status: 401 },
      );
    }

    const currentMatches = await verifyPassword(
      currentPassword,
      dbUser.passwordHash,
    );
    if (!currentMatches) {
      return Response.json(
        { error: "Password saat ini tidak valid." },
        { status: 400 },
      );
    }

    const sameAsCurrent = await verifyPassword(
      newPassword,
      dbUser.passwordHash,
    );
    if (sameAsCurrent) {
      return Response.json(
        { error: "Password baru harus berbeda dari password saat ini." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: dbUser.id },
        data: { passwordHash },
      }),
      prisma.session.deleteMany({
        where: {
          userId: dbUser.id,
          id: { not: currentSessionId },
        },
      }),
    ]);

    return Response.json({
      ok: true,
      message: "Password berhasil diubah.",
    });
  } catch (error) {
    console.error("Gagal mengubah password", error);
    return Response.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
