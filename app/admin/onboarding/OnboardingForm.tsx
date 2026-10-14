"use client";

import { createBusiness } from "@/app/admin/onboarding/actions";
import { BusyOverlay } from "@/app/admin/ui";
import { isValidSlug, slugifyName } from "@/lib/store/slug";
import { useState, useTransition } from "react";

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewSlug = slugTouched ? slug : slugifyName(name);

  return (
    <form
      className="relative flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("slug", previewSlug);
        startTransition(async () => {
          const result = await createBusiness(form);
          if (result && !result.ok) setError(result.error);
        });
      }}
    >
      <BusyOverlay show={pending} label="Creando pantalla…" />
      <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
        Nombre del negocio
        <input
          name="name"
          required
          minLength={2}
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tacos El Farol"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base font-medium text-zinc-900 outline-none focus:border-pink-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
        URL de la pantalla
        <span className="flex items-center gap-0 overflow-hidden rounded-lg border border-zinc-300 focus-within:border-pink-500">
          <span className="bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-500">/v/</span>
          <input
            name="slug"
            required
            value={previewSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value.toLowerCase());
            }}
            className="min-w-0 flex-1 px-3 py-2 text-base font-medium text-zinc-900 outline-none"
          />
        </span>
        {!isValidSlug(previewSlug) && previewSlug ? (
          <span className="text-xs font-medium text-amber-700">
            Usa minúsculas, números y guiones (3 a 40 caracteres).
          </span>
        ) : null}
      </label>
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear pantalla"}
      </button>
    </form>
  );
}
