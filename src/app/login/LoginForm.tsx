"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <Label
          htmlFor="username"
          className="block text-sm font-medium text-slate-800"
        >
          Username
        </Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="mt-1 h-10 bg-white"
        />
      </div>
      <div>
        <Label
          htmlFor="password"
          className="block text-sm font-medium text-slate-800"
        >
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 h-10 bg-white"
        />
      </div>
      {state.error ? (
        <p
          className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          role="alert"
          aria-live="polite"
        >
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
