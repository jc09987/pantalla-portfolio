"use client";

import {
  addStoreSender,
  removeStoreSender,
  replayCommand,
} from "@/app/admin/automations/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BusyOverlay } from "@/app/admin/ui";

export type AdminSender = {
  id: string;
  channel: string;
  sender: string;
  label: string | null;
};

export type AdminCommand = {
  id: string;
  channel: string;
  sender: string | null;
  raw: string | null;
  status: string;
  reply: string | null;
  created_at: string;
};

function statusLabel(status: string) {
  if (status === "applied") return "Aplicado";
  if (status === "rejected") return "Rechazado";
  if (status === "ambiguous") return "Ambiguo";
  if (status === "help") return "Ayuda";
  if (status === "unknown") return "No entendido";
  if (status === "error") return "Error";
  return status;
}

export function AutomationsClient({
  senders,
  commands,
  storeSlug,
  ingestConfigured,
}: {
  senders: AdminSender[];
  commands: AdminCommand[];
  storeSlug: string;
  ingestConfigured: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <BusyOverlay show={pending} cover="page" label="Guardando…" />
      <header>
        <h1 className="text-2xl font-black text-zinc-900">Automatizaciones</h1>
        <p className="mt-1 text-sm text-zinc-600">
          WhatsApp and email hit this app through a signed webhook. The sender
          allowlist runs first. Then a model may return only a closed command;
          unknown, a rejected shape, or a missing API key falls back to the
          regex parser.
        </p>
      </header>

      {message ? (
        <p className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold whitespace-pre-wrap text-white">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-bold tracking-wide text-zinc-500">INGEST</h2>
        <p className="mt-2 text-sm text-zinc-700">
          {ingestConfigured
            ? "HMAC listo. n8n debe firmar el cuerpo crudo con N8N_WEBHOOK_SECRET y mandar el header x-n8n-signature."
            : "Falta N8N_WEBHOOK_SECRET o SUPABASE_SERVICE_ROLE_KEY en el entorno."}
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
          {`POST /api/n8n/ingest
x-n8n-signature: <hmac-sha256 hex del body>
{
  "storeSlug": "${storeSlug}",
  "channel": "whatsapp",
  "from": "+5215550000000",
  "text": "agotado mango agua"
}`}
        </pre>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-bold tracking-wide text-zinc-500">REMITENTES</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {senders.length === 0 ? (
            <li className="text-sm text-zinc-500">Todavía no hay números ni correos.</li>
          ) : (
            senders.map((sender) => (
              <li key={sender.id} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-bold text-zinc-500">{sender.channel}</span>
                <span className="min-w-0 flex-1 font-semibold text-zinc-900">
                  {sender.sender}
                  {sender.label ? (
                    <span className="ml-2 font-medium text-zinc-500">{sender.label}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="text-xs font-bold text-red-600"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await removeStoreSender(sender.id);
                      setMessage(result.ok ? null : result.error);
                      router.refresh();
                    });
                  }}
                >
                  Quitar
                </button>
              </li>
            ))
          )}
        </ul>
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[8rem_1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            startTransition(async () => {
              const result = await addStoreSender(new FormData(form));
              if (result.ok) form.reset();
              setMessage(result.ok ? "Remitente agregado." : result.error);
              router.refresh();
            });
          }}
        >
          <select
            name="channel"
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            defaultValue="whatsapp"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
          <input
            name="sender"
            required
            placeholder="+52 55 1234 5678 o correo"
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            name="label"
            placeholder="Dueño, sucursal…"
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-60"
          >
            Agregar
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-bold tracking-wide text-zinc-500">ÚLTIMOS COMANDOS</h2>
        {commands.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Todavía no llega ningún mensaje.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs tracking-wide text-zinc-500">
                  <th className="py-2 pr-3 font-bold">Cuando</th>
                  <th className="py-2 pr-3 font-bold">De</th>
                  <th className="py-2 pr-3 font-bold">Texto</th>
                  <th className="py-2 pr-3 font-bold">Estado</th>
                  <th className="py-2 pr-3 font-bold">Respuesta</th>
                  <th className="py-2 font-bold" />
                </tr>
              </thead>
              <tbody>
                {commands.map((command) => (
                  <tr key={command.id} className="border-t border-zinc-100 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-zinc-500">
                      {new Date(command.created_at).toLocaleString("es-MX")}
                    </td>
                    <td className="py-2 pr-3 font-semibold text-zinc-800">
                      {command.sender ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-zinc-800">{command.raw ?? "—"}</td>
                    <td className="py-2 pr-3 font-bold">{statusLabel(command.status)}</td>
                    <td className="py-2 pr-3 whitespace-pre-wrap text-zinc-600">
                      {command.reply ?? "—"}
                    </td>
                    <td className="py-2">
                      {command.raw ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="text-xs font-bold text-pink-600"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await replayCommand(command.id);
                              setMessage(result.ok ? result.reply : result.error);
                              router.refresh();
                            });
                          }}
                        >
                          Rehacer
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}