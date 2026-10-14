import { applyParsedCommand, type ApplyResult } from "@/lib/n8n/apply";
import { resolveCommand } from "@/lib/n8n/resolve";
import { normalizeSender } from "@/lib/n8n/normalize";
import { serviceApi } from "@/lib/supabase/admin";
import type { ApiClient } from "@/lib/supabase/server";

export type IngestPayload = {
  storeSlug: string;
  channel: "whatsapp" | "email" | "admin";
  from: string;
  text: string;
  mediaBase64?: string;
  mediaMime?: string;
};

export type IngestOutcome = ApplyResult & {
  httpStatus: number;
  ok: boolean;
};

function asPayload(body: unknown): IngestPayload | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const storeSlug = typeof value.storeSlug === "string" ? value.storeSlug.trim() : "";
  const channel = value.channel;
  const from = typeof value.from === "string" ? value.from : "";
  const text = typeof value.text === "string" ? value.text : "";
  if (!storeSlug || (channel !== "whatsapp" && channel !== "email" && channel !== "admin")) {
    return null;
  }
  if (text.length > 500) return null;
  return {
    storeSlug,
    channel,
    from: from.trim(),
    text,
    mediaBase64: typeof value.mediaBase64 === "string" ? value.mediaBase64 : undefined,
    mediaMime: typeof value.mediaMime === "string" ? value.mediaMime : undefined,
  };
}

async function writeLog(
  api: ApiClient,
  input: {
    storeId: string;
    channel: string;
    sender: string | null;
    raw: string;
    parsed: unknown;
    status: string;
    reply: string;
  },
) {
  await api.from("command_log").insert({
    store_id: input.storeId,
    channel: input.channel,
    sender: input.sender,
    raw: input.raw,
    parsed: input.parsed,
    status: input.status,
    reply: input.reply,
  });
}

export async function ingestCommand(
  body: unknown,
  options: { skipAllowlist?: boolean; api?: ApiClient } = {},
): Promise<IngestOutcome> {
  const payload = asPayload(body);
  if (!payload) {
    return {
      ok: false,
      httpStatus: 400,
      status: "error",
      reply: "Cuerpo inválido.",
      published: false,
    };
  }

  const api = options.api ?? serviceApi();
  if (!api) {
    return {
      ok: false,
      httpStatus: 503,
      status: "error",
      reply: "Falta SUPABASE_SERVICE_ROLE_KEY.",
      published: false,
    };
  }

  const { data: store } = await api
    .from("stores")
    .select("id, slug")
    .eq("slug", payload.storeSlug)
    .maybeSingle();

  if (!store) {
    return {
      ok: false,
      httpStatus: 404,
      status: "error",
      reply: "Tienda no encontrada.",
      published: false,
    };
  }

  const channel = payload.channel === "admin" ? "admin" : payload.channel;
  const sender =
    channel === "admin"
      ? payload.from || "admin"
      : normalizeSender(channel, payload.from);

  if (channel !== "admin" && !options.skipAllowlist) {
    if (!sender) {
      return {
        ok: false,
        httpStatus: 400,
        status: "error",
        reply: "Remitente inválido.",
        published: false,
      };
    }
    const { data: allowed } = await api
      .from("store_senders")
      .select("id")
      .eq("store_id", store.id)
      .eq("channel", channel)
      .eq("sender", sender)
      .maybeSingle();
    if (!allowed) {
      await writeLog(api, {
        storeId: store.id,
        channel,
        sender,
        raw: payload.text,
        parsed: { type: "rejected" },
        status: "rejected",
        reply: "Este número o correo no está autorizado.",
      });
      return {
        ok: false,
        httpStatus: 403,
        status: "error",
        reply: "Este número o correo no está autorizado.",
        published: false,
      };
    }
  }

  const resolved = await resolveCommand(payload.text);
  const applied = await applyParsedCommand(api, store.id, resolved.command, {
    base64: payload.mediaBase64,
    mime: payload.mediaMime,
  });

  await writeLog(api, {
    storeId: store.id,
    channel,
    sender,
    raw: payload.text,
    parsed: {
      command: resolved.command,
      source: resolved.source,
      model: resolved.model,
    },
    status: applied.status,
    reply: applied.reply,
  });

  return {
    ...applied,
    ok: applied.status === "applied" || applied.status === "help" || applied.status === "ambiguous",
    httpStatus: applied.status === "error" ? 500 : 200,
  };
}