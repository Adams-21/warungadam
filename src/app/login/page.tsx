import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { LOGIN_UNAVAILABLE_MESSAGE } from "./login-rules";

export const instant = false;

export default async function LoginPage() {
  let user: CurrentUser | null = null;
  let sessionCheckFailed = false;

  try {
    user = await getCurrentUser();
  } catch {
    sessionCheckFailed = true;
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          BizManage
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Masuk menggunakan akun pengelola Anda.
        </p>
        {sessionCheckFailed ? (
          <p
            className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {LOGIN_UNAVAILABLE_MESSAGE}
          </p>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
