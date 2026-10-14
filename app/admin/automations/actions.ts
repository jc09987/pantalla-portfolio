"use server";

import { loadAdminCatalog, requireUser } from "@/lib/menu/catalog";
import { ingestCommand } from "@/lib/n8n/ingest";
import { normalizeSender } from "@/lib/n8n/normalize";
import { apiFrom } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateAutomations() {
  revalidatePath("/admin");
  revalidatePath("/admin/automations");
}

export async function addStoreSender(formData: FormData) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const auth = await requireUser();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: "Sesión expirada." };
  }

  const channel = String(formData.get("channel") ?? "");
  const raw = String(formData.get("sender") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (channel !== "whatsapp" && channel !== "email") {
    return { ok: false as const, error: "Canal inválido." };
  }

  const sender = normalizeSender(channel, raw);
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) {
    return { ok: false as const, error: "Correo inválido." };
  }
  if (channel === "whatsapp" && sender.replace(/\D/g, "").length < 8) {
    return { ok: false as const, error: "Número de WhatsApp inválido." };
  }

  const { error } = await apiFrom(auth.supabase).from("store_senders").insert({
    store_id: loaded.catalog.store.id,
    channel,
    sender,
    label: label || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Ese remitente ya está en la lista." };
    }
    return { ok: false as const, error: error.message };
  }

  revalidateAutomations();
  return { ok: true as const };
}

export async function removeStoreSender(senderId: string) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const auth = await requireUser();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: "Sesión expirada." };
  }

  const { error } = await apiFrom(auth.supabase)
    .from("store_senders")
    .delete()
    .eq("id", senderId)
    .eq("store_id", loaded.catalog.store.id);
  if (error) return { ok: false as const, error: error.message };

  revalidateAutomations();
  return { ok: true as const };
}

export async function replayCommand(logId: string) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const auth = await requireUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return { ok: false as const, error: "Sesión expirada." };
  }

  const api = apiFrom(auth.supabase);
  const { data: row, error } = await api
    .from("command_log")
    .select("id, raw")
    .eq("id", logId)
    .eq("store_id", loaded.catalog.store.id)
    .single();
  if (error || !row?.raw) {
    return { ok: false as const, error: "No se encontró el comando." };
  }

  const result = await ingestCommand(
    {
      storeSlug: loaded.catalog.store.slug,
      channel: "admin",
      from: auth.user.email ?? "admin",
      text: row.raw,
    },
    { skipAllowlist: true, api },
  );

  revalidatePath(`/v/${loaded.catalog.store.slug}`);
  revalidateAutomations();
  return result.ok
    ? { ok: true as const, reply: result.reply }
    : { ok: false as const, error: result.reply };
}