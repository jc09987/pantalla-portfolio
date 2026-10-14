"use server";

import { loadAdminCatalog, requireUser, touchMenu } from "@/lib/menu/catalog";
import { isValidSlug, slugifyName } from "@/lib/store/slug";
import type { MenuTheme } from "@/lib/menu/types";
import { apiFrom } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateBrand(slug: string, previousSlug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/branding");
  revalidatePath("/admin/layout");
  revalidatePath(`/v/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/v/${previousSlug}`);
  }
}

function asHex(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

export async function saveBranding(formData: FormData) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const auth = await requireUser();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: "Sesión expirada." };
  }
  if (loaded.catalog.store.role === "editor") {
    return { ok: false as const, error: "Solo un dueño o admin puede cambiar la marca." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = isValidSlug(slugInput) ? slugInput : slugifyName(slugInput || name);
  const title = String(formData.get("title") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const ribbon = String(formData.get("ribbon") ?? "").trim();
  const closing = String(formData.get("closing") ?? "").trim();
  const theme: MenuTheme = {
    primary: asHex(formData.get("primary"), loaded.catalog.branding.theme.primary),
    secondary: asHex(formData.get("secondary"), loaded.catalog.branding.theme.secondary),
    footer: asHex(formData.get("footer"), loaded.catalog.branding.theme.footer),
    gold: asHex(formData.get("gold"), loaded.catalog.branding.theme.gold),
    surface: asHex(
      formData.get("surface"),
      loaded.catalog.branding.theme.surface ?? "#ffffff",
    ),
    ink: asHex(formData.get("ink"), loaded.catalog.branding.theme.ink ?? "#18181b"),
  };

  if (name.length < 2 || name.length > 60) {
    return { ok: false as const, error: "El nombre debe tener entre 2 y 60 caracteres." };
  }
  if (!isValidSlug(slug)) {
    return {
      ok: false as const,
      error: "La URL debe ser minúsculas, números y guiones (3 a 40 caracteres).",
    };
  }

  const api = apiFrom(auth.supabase);
  const previousSlug = loaded.catalog.store.slug;

  const { error: storeError } = await api
    .from("stores")
    .update({ name, slug })
    .eq("id", loaded.catalog.store.id);
  if (storeError) {
    if (storeError.code === "23505") {
      return { ok: false as const, error: "Esa URL ya está en uso." };
    }
    return { ok: false as const, error: storeError.message };
  }

  const { data: menuRow } = await api
    .from("menus")
    .select("theme")
    .eq("id", loaded.catalog.menu.id)
    .maybeSingle();
  const currentTheme =
    menuRow?.theme && typeof menuRow.theme === "object" ? (menuRow.theme as Record<string, unknown>) : {};

  const { error: menuError } = await api
    .from("menus")
    .update({
      title: title || name,
      tagline,
      ribbon,
      closing,
      theme: {
        ...currentTheme,
        ...theme,
        orientation: loaded.catalog.menu.orientation,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", loaded.catalog.menu.id)
    .eq("store_id", loaded.catalog.store.id);
  if (menuError) return { ok: false as const, error: menuError.message };

  if (slug !== previousSlug) {
    await api
      .from("menu_snapshots")
      .update({ store_slug: slug })
      .eq("store_id", loaded.catalog.store.id);
  }

  await touchMenu(loaded.catalog.menu.id);
  revalidateBrand(slug, previousSlug);
  return { ok: true as const };
}

export async function setStoreLogo(url: string | null) {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  if (loaded.catalog.store.role === "editor") {
    return { ok: false as const, error: "Solo un dueño o admin puede cambiar el logo." };
  }
  const auth = await requireUser();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: "Sesión expirada." };
  }

  const { error } = await apiFrom(auth.supabase)
    .from("stores")
    .update({ logo_url: url })
    .eq("id", loaded.catalog.store.id);
  if (error) return { ok: false as const, error: error.message };

  await touchMenu(loaded.catalog.menu.id);
  revalidateBrand(loaded.catalog.store.slug);
  return { ok: true as const };
}
