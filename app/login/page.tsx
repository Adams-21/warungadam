import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

async function LoginContent() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return <LoginForm />;
}

export const metadata = {
  title: "Login - WarungAdam",
  description: "Masuk ke akun toko WarungAdam.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <Suspense
        fallback={
          <div className="h-[360px] w-full max-w-md animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        }
      >
        <LoginContent />
      </Suspense>
    </main>
  );
}