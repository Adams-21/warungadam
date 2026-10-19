import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

async function RegisterContent() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return <RegisterForm />;
}

export const metadata = {
  title: "Daftar Toko - WarungAdam",
  description: "Buat akun toko untuk mulai berjualan dengan WarungAdam.",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <Suspense
        fallback={
          <div className="h-[420px] w-full max-w-md animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        }
      >
        <RegisterContent />
      </Suspense>
    </main>
  );
}