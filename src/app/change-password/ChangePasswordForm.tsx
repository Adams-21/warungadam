"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@/components/ui";

type Fields = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialFields: Fields = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordForm() {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(initialFields);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(name: keyof Fields, value: string) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(data.error ?? "Gagal mengubah password.");
        return;
      }

      setFields(initialFields);
      setSuccess(data.message ?? "Password berhasil diubah.");
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <Label
          htmlFor="currentPassword"
          className="block text-sm font-medium text-slate-800"
        >
          Password saat ini
        </Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={fields.currentPassword}
          onChange={(event) => update("currentPassword", event.target.value)}
          className="mt-1 h-10 bg-white"
        />
      </div>
      <div>
        <Label
          htmlFor="newPassword"
          className="block text-sm font-medium text-slate-800"
        >
          Password baru
        </Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          maxLength={128}
          value={fields.newPassword}
          onChange={(event) => update("newPassword", event.target.value)}
          className="mt-1 h-10 bg-white"
        />
      </div>
      <div>
        <Label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-slate-800"
        >
          Konfirmasi password baru
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          maxLength={128}
          value={fields.confirmPassword}
          onChange={(event) => update("confirmPassword", event.target.value)}
          className="mt-1 h-10 bg-white"
        />
      </div>
      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-green-700" role="status">
          {success}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "Memproses..." : "Simpan Password"}
      </Button>
    </form>
  );
}
