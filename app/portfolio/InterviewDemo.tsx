"use client";

import { DEMO_SENDER } from "@/lib/demo/constants";
import { LA_MICHOACANA_SNAPSHOT } from "@/lib/menu/seeds/la-michoacana";
import type { MenuSnapshot } from "@/lib/menu/types";
import type { ModelOutcome } from "@/lib/n8n/model";
import type { ParsedCommand } from "@/lib/n8n/parse";
import { useRef, useState } from "react";

type Trace = {
  signature: "pass" | "fail";
  allowlist: "pass" | "skipped";
  model: {
    outcome: ModelOutcome;
    model: string | null;
    latencyMs: number | null;
    costUsd: number | null;
  };
  source: "model" | "regex" | null;
  command: ParsedCommand | null;
  status: string;
  reply: string;
  boardChanged: boolean;
  snapshot: MenuSnapshot | null;
};

const MESSY = "ya no hay del de mango de leche";
const CLEAR = "agotado mango de leche";

function money(value: number | null) {
  if (value == null) return "—";
  if (value === 0) return "$0";
  return `$${value.toFixed(6)}`;
}

export function InterviewDemo() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [snapshot, setSnapshot] = useState<MenuSnapshot>(LA_MICHOACANA_SNAPSHOT);
  const [text, setText] = useState(CLEAR);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function push(next: MenuSnapshot) {
    frameRef.current?.contentWindow?.postMessage(
      { type: "pantalla-demo-snapshot", snapshot: next },
      window.location.origin,
    );
  }

  async function send(mode: "message" | "bad_signature" | "unknown") {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/demo/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, text, snapshot }),
      });
      const body = (await response.json()) as Trace & { error?: string };
      if (!response.ok) {
        setError(body.error || "The demo request failed.");
        return;
      }
      setTrace(body);
      if (body.boardChanged && body.snapshot) {
        setSnapshot(body.snapshot);
        push(body.snapshot);
      }
    } catch {
      setError("The demo request failed.");
    } finally {
      setPending(false);
    }
  }

  function reset() {
    const next = structuredClone(LA_MICHOACANA_SNAPSHOT);
    setSnapshot(next);
    setTrace(null);
    push(next);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="rounded-3xl border border-zinc-200 bg-white p-4">
        <p className="text-xs font-black tracking-[0.18em] text-zinc-500">WHATSAPP</p>
        <p className="mt-1 text-sm font-semibold text-zinc-600">
          Allowlisted sender {DEMO_SENDER}
        </p>
        <label className="mt-4 block text-xs font-bold text-zinc-500" htmlFor="demo-text">
          Message
        </label>
        <textarea
          id="demo-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700"
            onClick={() => setText(CLEAR)}
          >
            Grammar command
          </button>
          <button
            type="button"
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700"
            onClick={() => setText(MESSY)}
          >
            Messy sentence
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void send("message")}
            className="rounded-full bg-pink-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            Send WhatsApp
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void send("bad_signature")}
            className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-800 disabled:opacity-60"
          >
            Send with a bad signature
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void send("unknown")}
            className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-800 disabled:opacity-60"
          >
            Send an unknown command
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={reset}
            className="rounded-full px-4 py-2 text-sm font-bold text-zinc-500"
          >
            Reset the board
          </button>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <TracePanel trace={trace} />
      </div>

      <div>
        <div className="aspect-video overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          <iframe
            ref={frameRef}
            src="/demo/board"
            title="Live menu board"
            className="h-full w-full"
            onLoad={() => push(snapshot)}
          />
        </div>
        <p className="mt-2 text-xs font-semibold text-zinc-500">
          Same renderer as the in-store TV. A bad signature or an unknown
          command leaves this board as it is.
        </p>
      </div>
    </div>
  );
}

function TracePanel({ trace }: { trace: Trace | null }) {
  if (!trace) {
    return (
      <p className="mt-4 text-sm font-semibold text-zinc-500">
        Send a message. The trace shows the signature, the allowlist, then the
        model or the regex fallback.
      </p>
    );
  }

  const command = trace.command ? trace.command.type : "—";
  return (
    <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="font-bold text-zinc-500">Signature</dt>
      <dd className="font-semibold text-zinc-900">{trace.signature}</dd>
      <dt className="font-bold text-zinc-500">Allowlist</dt>
      <dd className="font-semibold text-zinc-900">{trace.allowlist}</dd>
      <dt className="font-bold text-zinc-500">Model</dt>
      <dd className="font-semibold text-zinc-900">
        {trace.model.outcome}
        {trace.model.model ? ` · ${trace.model.model}` : ""}
        {trace.model.latencyMs != null ? ` · ${trace.model.latencyMs} ms` : ""}
        {trace.model.costUsd != null ? ` · ${money(trace.model.costUsd)}` : ""}
      </dd>
      <dt className="font-bold text-zinc-500">Resolver</dt>
      <dd className="font-semibold text-zinc-900">{trace.source ?? "—"}</dd>
      <dt className="font-bold text-zinc-500">Command</dt>
      <dd className="font-semibold text-zinc-900">{command}</dd>
      <dt className="font-bold text-zinc-500">Board</dt>
      <dd className="font-semibold text-zinc-900">
        {trace.boardChanged ? "updated" : "unchanged"}
      </dd>
      <dt className="font-bold text-zinc-500">Reply</dt>
      <dd className="whitespace-pre-wrap font-semibold text-zinc-700">{trace.reply}</dd>
    </dl>
  );
}
