"use client";

import { sendAdminSupportEmail } from "@/app/admin/team/actions";
import { BusyOverlay } from "@/app/admin/ui";
import { useRef, useState, useTransition } from "react";

const TOPICS = [
  { value: "design", label: "Diseño", hint: "Cambios de layout, textos o cómo se ve la TV." },
  { value: "bug", label: "Error", hint: "Algo no carga, se ve mal o no se publica." },
  { value: "info", label: "Información general", hint: "Dudas, altas y avisos para el equipo." },
] as const;

export function SupportForm({
  email,
  storeName,
}: {
  email: string;
  storeName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["value"]>("design");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = TOPICS.find((entry) => entry.value === topic) ?? TOPICS[0];

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8">
      <BusyOverlay show={pending} cover="page" label="Enviando…" />
      <header>
        <h1 className="text-2xl font-black text-zinc-900">Soporte</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Escríbenos sobre diseño, errores o información general. El mensaje sale de{" "}
          <span className="font-bold text-zinc-800">{email || "tu cuenta"}</span> para{" "}
          <span className="font-bold text-zinc-800">{storeName}</span>.
        </p>
      </header>

      <form
        ref={formRef}
        className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const result = await sendAdminSupportEmail(form);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setMessage("Mensaje enviado. Te respondemos a este correo.");
            formRef.current?.reset();
            setTopic("design");
          });
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-bold text-zinc-700">Tipo</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {TOPICS.map((entry) => {
              const selected = topic === entry.value;
              return (
                <label
                  key={entry.value}
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-left ${
                    selected ? "border-pink-500 bg-pink-50" : "border-zinc-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="topic"
                    value={entry.value}
                    checked={selected}
                    className="sr-only"
                    onChange={() => setTopic(entry.value)}
                  />
                  <span className="block text-sm font-black text-zinc-900">{entry.label}</span>
                  <span className="mt-1 block text-xs font-semibold text-zinc-500">{entry.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm font-bold text-zinc-700">
          Asunto
          <input
            name="subject"
            maxLength={120}
            disabled={pending}
            placeholder={`Opcional · ${active.label}`}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base font-semibold text-zinc-900 outline-none focus:border-pink-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-zinc-700">
          Mensaje
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={4000}
            rows={8}
            disabled={pending}
            placeholder="Qué quieres cambiar, qué se rompió o qué necesitamos saber."
            className="resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base font-semibold text-zinc-900 outline-none focus:border-pink-500"
          />
        </label>

        {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
        {message ? <p className="text-sm font-bold text-emerald-700">{message}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-pink-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
