"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

function safeNext(raw?: string) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return "/admin";
  }
  return raw;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);
    if (signInError) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
        Correo
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-medium text-zinc-900 outline-none focus:border-pink-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
        Contraseña
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-medium text-zinc-900 outline-none focus:border-pink-500"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Un momento…" : "Entrar"}
      </button>
    </form>
  );
}
