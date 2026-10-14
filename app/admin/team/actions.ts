"use server";

import { loadAdminCatalog, requireUser } from "@/lib/menu/catalog";
import {
  contactInbox,
  createMailerSendTransport,
  mailerSendConfigured,
  mailerSendFrom,
} from "@/lib/mail/mailersend";
import { apiFrom } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateTeam() {
  revalidatePath("/admin/team");
}

export async function inviteMember(formData: FormData) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const auth = await requireUser();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: "Sesión expirada." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "editor");
  const { data, error } = await apiFrom(auth.supabase).rpc("invite_to_store", {
    p_store_id: loaded.catalog.store.id,
    p_email: email,
    p_role: role,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidateTeam();
  return { ok: true as const, id: data as string };
}

export async function revokeInvite(inviteId: string) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const auth = await requireUser();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: "Sesión expirada." };
  }

  const { error } = await apiFrom(auth.supabase)
    .from("store_invites")
    .delete()
    .eq("id", inviteId)
    .eq("store_id", loaded.catalog.store.id)
    .is("accepted_at", null);
  if (error) return { ok: false as const, error: error.message };
  revalidateTeam();
  return { ok: true as const };
}

export async function removeMember(userId: string) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const auth = await requireUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return { ok: false as const, error: "Sesión expirada." };
  }
  if (userId === auth.user.id) {
    return { ok: false as const, error: "No puedes quitarte a ti mismo." };
  }

  const { error } = await apiFrom(auth.supabase)
    .from("store_members")
    .delete()
    .eq("store_id", loaded.catalog.store.id)
    .eq("user_id", userId);
  if (error) return { ok: false as const, error: error.message };
  revalidateTeam();
  return { ok: true as const };
}

export async function updateMemberRole(userId: string, role: string) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  if (role !== "owner" && role !== "admin" && role !== "editor") {
    return { ok: false as const, error: "Rol inválido." };
  }
  const auth = await requireUser();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: "Sesión expirada." };
  }

  const { error } = await apiFrom(auth.supabase)
    .from("store_members")
    .update({ role })
    .eq("store_id", loaded.catalog.store.id)
    .eq("user_id", userId);
  if (error) return { ok: false as const, error: error.message };
  revalidateTeam();
  return { ok: true as const };
}

const TOPICS = {
  design: "Diseño",
  bug: "Error",
  info: "Información general",
} as const;

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendAdminSupportEmail(formData: FormData) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const auth = await requireUser();
  if (auth.error || !auth.user) {
    return { ok: false as const, error: "Sesión expirada." };
  }

  const topic = String(formData.get("topic") ?? "") as keyof typeof TOPICS;
  const topicLabel = TOPICS[topic];
  const subject = cleanHeader(String(formData.get("subject") ?? "")).slice(0, 120);
  const message = String(formData.get("message") ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 4000);

  if (!topicLabel) {
    return { ok: false as const, error: "Elige un tipo de mensaje." };
  }
  if (message.length < 10) {
    return { ok: false as const, error: "Cuéntanos un poco más (mínimo 10 caracteres)." };
  }
  if (!mailerSendConfigured()) {
    return {
      ok: false as const,
      error: "El correo no está configurado. Faltan las variables SMTP de MailerSend.",
    };
  }

  const store = loaded.catalog.store;
  const email = loaded.catalog.email || auth.user.email || "";
  const from = mailerSendFrom();
  const prefix = `Soporte · ${topicLabel} · ${store.name}`;
  const fullSubject = subject ? `${prefix} · ${subject}` : prefix;

  try {
    const transport = createMailerSendTransport();
    await transport.sendMail({
      from: `${from.name} <${from.email}>`,
      to: contactInbox(),
      replyTo: email || undefined,
      subject: fullSubject,
      text: [
        `Tipo: ${topicLabel}`,
        subject ? `Asunto: ${subject}` : null,
        `Negocio: ${store.name}`,
        `URL: /v/${store.slug}`,
        `Rol: ${store.role}`,
        email ? `Correo: ${email}` : null,
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "No se pudo enviar. Intenta de nuevo en un momento.",
    };
  }
}
