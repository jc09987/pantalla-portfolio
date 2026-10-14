import { applyCommandToSnapshot } from "@/lib/demo/apply-snapshot";
import { DEMO_SENDER, DEMO_STORE, UNKNOWN_DEMO_TEXT } from "@/lib/demo/constants";
import { signN8nBody, verifyN8nSignature } from "@/lib/n8n/hmac";
import type { ModelTrace } from "@/lib/n8n/model";
import { resolveCommand } from "@/lib/n8n/resolve";
import type { ParsedCommand } from "@/lib/n8n/parse";
import { LA_MICHOACANA_SNAPSHOT } from "@/lib/menu/seeds/la-michoacana";
import type { MenuSnapshot } from "@/lib/menu/types";

const FALLBACK_DEMO_SECRET = "pantalla-demo-interview";
const DEMO_ALLOWLIST = new Set([DEMO_SENDER]);

export function demoSecret() {
  return process.env.PANTALLA_DEMO_SECRET?.trim() || FALLBACK_DEMO_SECRET;
}

export type DemoMode = "message" | "bad_signature" | "unknown";

export type DemoTrace = {
  signature: "pass" | "fail";
  allowlist: "pass" | "skipped";
  model: ModelTrace;
  source: "model" | "regex" | null;
  command: ParsedCommand | null;
  status: string;
  reply: string;
  boardChanged: boolean;
  snapshot: MenuSnapshot | null;
};

function notCalled(): ModelTrace {
  return {
    outcome: "not_called",
    model: null,
    latencyMs: null,
    costUsd: null,
    command: null,
    error: null,
  };
}

function snapshotOf(value: unknown): MenuSnapshot {
  if (!value || typeof value !== "object") return structuredClone(LA_MICHOACANA_SNAPSHOT);
  const snapshot = value as MenuSnapshot;
  if (snapshot.store?.slug !== DEMO_STORE || !Array.isArray(snapshot.sections)) {
    return structuredClone(LA_MICHOACANA_SNAPSHOT);
  }
  return snapshot;
}

export async function runDemoTurn(input: {
  mode: DemoMode;
  text?: string;
  snapshot?: unknown;
}): Promise<DemoTrace> {
  const snapshot = snapshotOf(input.snapshot);
  const text =
    input.mode === "unknown" ? UNKNOWN_DEMO_TEXT : (input.text ?? "").trim().slice(0, 500);
  const body = JSON.stringify({
    storeSlug: DEMO_STORE,
    channel: "whatsapp",
    from: DEMO_SENDER,
    text,
  });
  const secret = demoSecret();
  const signature =
    input.mode === "bad_signature" ? "0".repeat(64) : signN8nBody(body, secret);

  if (!verifyN8nSignature(body, signature, secret)) {
    return {
      signature: "fail",
      allowlist: "skipped",
      model: notCalled(),
      source: null,
      command: null,
      status: "rejected",
      reply: "Firma HMAC inválida. El menú no se tocó.",
      boardChanged: false,
      snapshot: null,
    };
  }

  const payload = JSON.parse(body) as { from?: string };
  if (!payload.from || !DEMO_ALLOWLIST.has(payload.from)) {
    return {
      signature: "pass",
      allowlist: "skipped",
      model: notCalled(),
      source: null,
      command: null,
      status: "rejected",
      reply: "Este número no está autorizado.",
      boardChanged: false,
      snapshot: null,
    };
  }

  if (!text) {
    return {
      signature: "pass",
      allowlist: "pass",
      model: notCalled(),
      source: null,
      command: null,
      status: "rejected",
      reply: "El mensaje está vacío.",
      boardChanged: false,
      snapshot: null,
    };
  }

  const resolved = await resolveCommand(text);
  const applied = applyCommandToSnapshot(snapshot, resolved.command);
  return {
    signature: "pass",
    allowlist: "pass",
    model: resolved.model,
    source: resolved.source,
    command: resolved.command,
    status: applied.status,
    reply: applied.reply,
    boardChanged: applied.changed,
    snapshot: applied.changed ? applied.snapshot : null,
  };
}
