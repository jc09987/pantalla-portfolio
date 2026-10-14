"use server";

import {
  buildAndPublishSnapshot,
  requireUser,
  touchMenu,
} from "@/lib/menu/catalog";
import { resolveStoreMenuId } from "@/lib/menu/store-menu";
import { parseOrientation } from "@/lib/display/stage";
import { isLayoutKey } from "@/lib/menu/types";
import {
  defaultSectionName,
  isSectionComponent,
  type SectionComponent,
} from "@/lib/menu/sections";
import {
  ensureLayoutPlan,
  MAX_LAYOUT_SECTIONS,
  newLayoutSectionId,
  parseLayoutPlan,
  type LayoutPlanSection,
} from "@/lib/menu/layout-plan";
import { loadLayoutPlan, persistSectionIcon, readMenuTheme, saveLayoutPlan } from "@/lib/menu/layout-sections";
import {
  asListIcon,
  defaultListIcon,
  isListIcon,
  themeWithSectionIcon,
  type ListIcon,
} from "@/lib/menu/list-icons";
import { resolveActiveStore } from "@/lib/store/session";
import { apiFrom, type ApiClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function mutationContext(menuId?: string) {
  const auth = await requireUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return { ok: false as const, error: "Sesión expirada." };
  }
  const api = apiFrom(auth.supabase);
  const store = await resolveActiveStore(api, auth.user.id);
  if (!store) {
    return { ok: false as const, error: "No se encontró la tienda." };
  }

  let resolvedId = menuId;
  if (resolvedId) {
    const { data: owned } = await api
      .from("menus")
      .select("id")
      .eq("id", resolvedId)
      .eq("store_id", store.id)
      .maybeSingle();
    if (!owned?.id) resolvedId = undefined;
  }
  if (!resolvedId) {
    resolvedId = (await resolveStoreMenuId(api, store.id)) ?? undefined;
  }
  if (!resolvedId) {
    return { ok: false as const, error: "No se encontró el menú." };
  }

  return {
    ok: true as const,
    api,
    menuId: resolvedId,
    storeSlug: store.slug,
  };
}

async function maxSortOrder(api: ApiClient, sectionId: string) {
  const { data } = await api
    .from("menu_items")
    .select("sort_order")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.sort_order ?? -1;
}

export async function addMenuItem(sectionId: string, name: string, menuId?: string) {
  const label = normalizeName(name);
  if (label.length < 2 || label.length > 40) {
    return { ok: false as const, error: "El nombre debe tener entre 2 y 40 caracteres." };
  }

  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const { data: section } = await ctx.api
    .from("menu_sections")
    .select("id, menu_id")
    .eq("id", sectionId)
    .eq("menu_id", ctx.menuId)
    .maybeSingle();
  if (!section) return { ok: false as const, error: "Sección no encontrada." };

  const { data, error } = await ctx.api
    .from("menu_items")
    .insert({
      section_id: sectionId,
      name: label,
      is_available: true,
      animation_preset: "cascade",
      sort_order: (await maxSortOrder(ctx.api, sectionId)) + 1,
    })
    .select("id, name, is_available, sort_order")
    .single();
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "No se pudo agregar." };
  }

  await touchMenu(ctx.menuId);
  return {
    ok: true as const,
    item: {
      id: data.id as string,
      name: data.name as string,
      description: null,
      price: null,
      is_available: Boolean(data.is_available),
      sort_order: Number(data.sort_order),
      images: [],
    },
  };
}

export async function updateMenuItem(
  itemId: string,
  patch: {
    name?: string;
    is_available?: boolean;
    description?: string | null;
    price?: number | null;
  },
  menuId?: string,
) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const next: {
    name?: string;
    is_available?: boolean;
    description?: string | null;
    price?: number | null;
  } = {};
  if (typeof patch.name === "string") {
    const label = normalizeName(patch.name);
    if (label.length < 2 || label.length > 40) {
      return { ok: false as const, error: "El nombre debe tener entre 2 y 40 caracteres." };
    }
    next.name = label;
  }
  if (typeof patch.is_available === "boolean") {
    next.is_available = patch.is_available;
  }
  if (patch.description !== undefined) {
    const text = (patch.description ?? "").trim();
    if (text.length > 120) {
      return { ok: false as const, error: "La descripción no puede pasar de 120 caracteres." };
    }
    next.description = text || null;
  }
  if (patch.price !== undefined) {
    if (patch.price == null) {
      next.price = null;
    } else if (!Number.isFinite(patch.price) || patch.price < 0 || patch.price > 9999) {
      return { ok: false as const, error: "Precio inválido." };
    } else {
      next.price = Math.round(patch.price * 100) / 100;
    }
  }
  if (Object.keys(next).length === 0) return { ok: true as const };

  const { data, error } = await ctx.api
    .from("menu_items")
    .update(next)
    .eq("id", itemId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "No se pudo guardar el sabor." };

  await touchMenu(ctx.menuId);
  return { ok: true as const };
}

export async function deleteMenuItem(itemId: string, menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.api
    .from("menu_items")
    .delete()
    .eq("id", itemId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "No se pudo quitar el sabor." };

  await touchMenu(ctx.menuId);
  return { ok: true as const };
}

export async function updateTierPrice(tierId: string, price: number, menuId?: string) {
  if (!Number.isFinite(price) || price < 0 || price > 9999) {
    return { ok: false as const, error: "Precio inválido." };
  }

  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.api
    .from("price_tiers")
    .update({ price })
    .eq("id", tierId)
    .eq("menu_id", ctx.menuId)
    .select("id, price")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "No se pudo guardar el precio." };

  await touchMenu(ctx.menuId);
  return { ok: true as const, price: Number(data.price) };
}

export async function updateLayoutKey(menuId: string, layoutKey: string) {
  if (!isLayoutKey(layoutKey)) {
    return { ok: false as const, error: "Diseño no válido." };
  }

  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.api
    .from("menus")
    .update({ layout_key: layoutKey, updated_at: new Date().toISOString() })
    .eq("id", ctx.menuId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "No se pudo guardar el diseño." };

  return { ok: true as const, layoutKey };
}

export async function updateOrientation(menuId: string, orientation: string) {
  const next = parseOrientation(orientation);
  if (!next) {
    return { ok: false as const, error: "Orientación no válida." };
  }

  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const now = new Date().toISOString();
  const { data: current } = await ctx.api
    .from("menus")
    .select("theme")
    .eq("id", ctx.menuId)
    .maybeSingle();
  const theme = {
    ...(current?.theme && typeof current.theme === "object" ? current.theme : {}),
    orientation: next,
  };

  const { data, error } = await ctx.api
    .from("menus")
    .update({ orientation: next, theme, updated_at: now })
    .eq("id", ctx.menuId)
    .select("id")
    .maybeSingle();

  if (error?.message.toLowerCase().includes("orientation")) {
    const fallback = await ctx.api
      .from("menus")
      .update({ theme, updated_at: now })
      .eq("id", ctx.menuId)
      .select("id")
      .maybeSingle();
    if (fallback.error) return { ok: false as const, error: fallback.error.message };
    if (!fallback.data) return { ok: false as const, error: "No se pudo guardar la orientación." };
    return { ok: true as const, orientation: next };
  }

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "No se pudo guardar la orientación." };

  return { ok: true as const, orientation: next };
}

async function maxSectionSort(api: ApiClient, menuId: string) {
  const { data } = await api
    .from("menu_sections")
    .select("sort_order")
    .eq("menu_id", menuId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.sort_order ?? -1;
}

async function currentLayoutPlan(ctx: { api: ApiClient; menuId: string }) {
  const theme = await readMenuTheme(ctx.api, ctx.menuId);
  const { data: blocks } = await ctx.api
    .from("menu_sections")
    .select("id, component")
    .eq("menu_id", ctx.menuId)
    .order("sort_order");
  return loadLayoutPlan(
    ctx.api,
    ctx.menuId,
    theme,
    (blocks ?? []).map((block) => ({
      id: block.id as string,
      component: (block.component as string | null) ?? "products",
    })),
  );
}

export async function addMenuSection(
  component: string,
  menuId?: string,
  layoutSectionId?: string,
  options?: { name?: string; icon?: string },
) {
  if (!isSectionComponent(component)) {
    return { ok: false as const, error: "Componente no válido." };
  }
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const theme = await readMenuTheme(ctx.api, ctx.menuId);
  const plan = await currentLayoutPlan(ctx);
  if (!layoutSectionId || !plan.some((band) => band.id === layoutSectionId)) {
    return { ok: false as const, error: "Elige una sección para el componente." };
  }

  const { count } = await ctx.api
    .from("menu_sections")
    .select("id", { count: "exact", head: true })
    .eq("menu_id", ctx.menuId);
  if ((count ?? 0) >= 8) {
    return { ok: false as const, error: "Máximo 8 componentes en la pantalla." };
  }

  let name = defaultSectionName(component);
  if (typeof options?.name === "string") {
    name = normalizeName(options.name);
    if (name.length < 2 || name.length > 40) {
      return { ok: false as const, error: "El nombre debe tener entre 2 y 40 caracteres." };
    }
  } else if (component === "products") {
    return { ok: false as const, error: "Escribe el nombre de la lista." };
  }

  const headerIcon: ListIcon =
    component === "products"
      ? asListIcon(options?.icon, defaultListIcon())
      : defaultListIcon();
  const kind =
    headerIcon === "water"
      ? "agua"
      : headerIcon === "milk"
        ? "leche"
        : component === "products" || component === "carousel" || component === "promo"
          ? ((count ?? 0) % 2 === 0 ? "leche" : "agua")
          : "leche";
  const columns = component === "products" ? 2 : 1;
  const sortOrder = (await maxSectionSort(ctx.api, ctx.menuId)) + 1;
  const baseRow = {
    menu_id: ctx.menuId,
    name,
    kind,
    columns,
    sort_order: sortOrder,
  };
  const insertSection = (row: Record<string, unknown>) =>
    ctx.api.from("menu_sections").insert(row).select("id, name, kind, columns").single();
  const attempts = [
    { ...baseRow, component, header_icon: headerIcon },
    { ...baseRow, component },
    { ...baseRow, header_icon: headerIcon },
    baseRow,
  ];
  type InsertedSection = { id: string; name: string; kind: string; columns: number };
  let data: InsertedSection | null = null;
  let error: { message?: string } | null = null;
  for (const row of attempts) {
    const result = await insertSection(row);
    data = (result.data as InsertedSection | null) ?? null;
    error = result.error;
    if (!error && data) break;
    const message = (error?.message ?? "").toLowerCase();
    const retryable =
      missingColumn(error, "header_icon") ||
      missingColumn(error, "component") ||
      message.includes("component");
    if (!retryable) break;
  }
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "No se pudo agregar el componente." };
  }

  const nextPlan = plan.map((band) =>
    band.id === layoutSectionId
      ? { ...band, componentIds: [...band.componentIds, data.id as string] }
      : band,
  );
  const themeForSave =
    component === "products"
      ? themeWithSectionIcon(theme as Record<string, unknown>, data.id as string, headerIcon)
      : theme;
  await saveLayoutPlan(ctx.api, ctx.menuId, themeForSave, nextPlan);

  await touchMenu(ctx.menuId);
  return {
    ok: true as const,
    id: data.id as string,
    layoutSections: nextPlan,
    section: {
      id: data.id as string,
      name: data.name as string,
      kind: data.kind as string,
      component,
      columns: Number(data.columns) || columns,
      headerIcon,
      layoutSectionId,
      items: [],
    },
  };
}

function missingColumn(error: { message?: string; code?: string } | null | undefined, column: string) {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes(column) ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

export async function updateMenuSection(
  sectionId: string,
  patch: { name?: string; component?: string; columns?: number; kind?: string; icon?: string },
  menuId?: string,
) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const next: {
    name?: string;
    component?: SectionComponent;
    columns?: number;
    kind?: string;
  } = {};
  if (typeof patch.name === "string") {
    const label = normalizeName(patch.name);
    if (label.length < 2 || label.length > 40) {
      return { ok: false as const, error: "El nombre debe tener entre 2 y 40 caracteres." };
    }
    next.name = label;
  }
  if (typeof patch.component === "string") {
    if (!isSectionComponent(patch.component)) {
      return { ok: false as const, error: "Componente no válido." };
    }
    next.component = patch.component;
  }
  if (typeof patch.columns === "number" && patch.columns >= 1 && patch.columns <= 3) {
    next.columns = patch.columns;
  }
  if (patch.kind === "agua" || patch.kind === "leche") {
    next.kind = patch.kind;
  }
  const icon = isListIcon(patch.icon) ? patch.icon : undefined;
  if (icon === "water") next.kind = "agua";
  if (icon === "milk") next.kind = "leche";
  if (Object.keys(next).length === 0 && !icon) return { ok: true as const };

  if (Object.keys(next).length > 0) {
    const { data, error } = await ctx.api
      .from("menu_sections")
      .update(next)
      .eq("id", sectionId)
      .eq("menu_id", ctx.menuId)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    if (!data) return { ok: false as const, error: "No se pudo guardar la sección." };
  }

  if (icon) {
    const saved = await persistSectionIcon(ctx.api, ctx.menuId, sectionId, icon);
    if (!saved.ok) return saved;
  }

  await touchMenu(ctx.menuId);
  return { ok: true as const, patch: { ...next, ...(icon ? { icon } : {}) } };
}

export async function deleteMenuSection(sectionId: string, menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.api
    .from("menu_sections")
    .delete()
    .eq("id", sectionId)
    .eq("menu_id", ctx.menuId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "No se pudo quitar el componente." };

  const theme = await readMenuTheme(ctx.api, ctx.menuId);
  const plan = await currentLayoutPlan(ctx);
  await saveLayoutPlan(
    ctx.api,
    ctx.menuId,
    theme,
    plan.map((band) => ({
      ...band,
      componentIds: band.componentIds.filter((id) => id !== sectionId),
    })),
  );

  await touchMenu(ctx.menuId);
  return { ok: true as const };
}

export async function moveMenuSection(
  sectionId: string,
  direction: "up" | "down",
  menuId?: string,
) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const { data: rows } = await ctx.api
    .from("menu_sections")
    .select("id, sort_order")
    .eq("menu_id", ctx.menuId)
    .order("sort_order");
  const list = rows ?? [];
  const index = list.findIndex((row) => row.id === sectionId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= list.length) {
    return { ok: true as const };
  }
  const current = list[index];
  const other = list[swapWith];
  await ctx.api.from("menu_sections").update({ sort_order: other.sort_order }).eq("id", current.id);
  await ctx.api.from("menu_sections").update({ sort_order: current.sort_order }).eq("id", other.id);
  await touchMenu(ctx.menuId);
  return { ok: true as const };
}

export async function addLayoutSection(menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const theme = await readMenuTheme(ctx.api, ctx.menuId);
  const plan = await currentLayoutPlan(ctx);
  if (plan.length >= MAX_LAYOUT_SECTIONS) {
    return { ok: false as const, error: "Máximo 6 secciones en la pantalla." };
  }
  const next: LayoutPlanSection[] = [
    ...plan,
    {
      id: newLayoutSectionId(),
      name: `Sección ${plan.length + 1}`,
      componentIds: [],
    },
  ];
  const saved = await saveLayoutPlan(ctx.api, ctx.menuId, theme, next);
  if (!saved.ok) return saved;
  await touchMenu(ctx.menuId);
  return { ok: true as const, layoutSections: next };
}

export async function renameLayoutSection(sectionId: string, name: string, menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;
  const label = normalizeName(name);
  if (label.length < 2 || label.length > 40) {
    return { ok: false as const, error: "El nombre debe tener entre 2 y 40 caracteres." };
  }
  const theme = await readMenuTheme(ctx.api, ctx.menuId);
  const plan = await currentLayoutPlan(ctx);
  const next = plan.map((band) => (band.id === sectionId ? { ...band, name: label } : band));
  const saved = await saveLayoutPlan(ctx.api, ctx.menuId, theme, next);
  if (!saved.ok) return saved;
  await touchMenu(ctx.menuId);
  return { ok: true as const, layoutSections: next };
}

export async function deleteLayoutSection(sectionId: string, menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;
  const theme = await readMenuTheme(ctx.api, ctx.menuId);
  const plan = await currentLayoutPlan(ctx);
  const remaining = plan.filter((band) => band.id !== sectionId);
  const saved = await saveLayoutPlan(ctx.api, ctx.menuId, theme, remaining);
  if (!saved.ok) return saved;
  await touchMenu(ctx.menuId);
  return { ok: true as const, layoutSections: remaining };
}

export async function updateLayoutPlan(planInput: unknown, menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;
  const parsed = parseLayoutPlan(planInput);
  if (parsed == null) return { ok: false as const, error: "Secciones no válidas." };
  if (parsed.length > MAX_LAYOUT_SECTIONS) {
    return { ok: false as const, error: "Máximo 6 secciones en la pantalla." };
  }
  const theme = await readMenuTheme(ctx.api, ctx.menuId);
  const { data: blocks } = await ctx.api
    .from("menu_sections")
    .select("id")
    .eq("menu_id", ctx.menuId)
    .order("sort_order");
  const next = ensureLayoutPlan(
    (blocks ?? []).map((block) => block.id as string),
    parsed,
  );
  const saved = await saveLayoutPlan(ctx.api, ctx.menuId, theme, next);
  if (!saved.ok) return saved;
  await touchMenu(ctx.menuId);
  return { ok: true as const, layoutSections: next };
}

export async function addPriceTier(menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;

  const { data: last } = await ctx.api
    .from("price_tiers")
    .select("sort_order")
    .eq("menu_id", ctx.menuId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await ctx.api
    .from("price_tiers")
    .insert({
      menu_id: ctx.menuId,
      label: "NUEVO",
      price: 0,
      scoop_count: 1,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "No se pudo agregar el precio." };
  }
  await touchMenu(ctx.menuId);
  revalidatePath("/admin");
  return { ok: true as const, id: data.id as string };
}

export async function updateTierLabel(tierId: string, label: string, menuId?: string) {
  const name = normalizeName(label);
  if (name.length < 2 || name.length > 24) {
    return { ok: false as const, error: "La etiqueta debe tener entre 2 y 24 caracteres." };
  }
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.api
    .from("price_tiers")
    .update({ label: name })
    .eq("id", tierId)
    .eq("menu_id", ctx.menuId);
  if (error) return { ok: false as const, error: error.message };
  await touchMenu(ctx.menuId);
  return { ok: true as const };
}

export async function deletePriceTier(tierId: string, menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.api
    .from("price_tiers")
    .delete()
    .eq("id", tierId)
    .eq("menu_id", ctx.menuId);
  if (error) return { ok: false as const, error: error.message };
  await touchMenu(ctx.menuId);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function addHero(menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;
  const { data: last } = await ctx.api
    .from("hero_spots")
    .select("sort_order")
    .eq("menu_id", ctx.menuId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await ctx.api
    .from("hero_spots")
    .insert({
      menu_id: ctx.menuId,
      caption: "Destacado",
      variant: "mango",
      animation_preset: "float",
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "No se pudo agregar el destacado." };
  }
  await touchMenu(ctx.menuId);
  revalidatePath("/admin");
  revalidatePath("/admin/media");
  return { ok: true as const, id: data.id as string };
}

export async function updateHero(
  heroId: string,
  patch: { caption?: string | null; badge?: string | null },
  menuId?: string,
) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;
  const next: { caption?: string | null; badge?: string | null } = {};
  if (patch.caption !== undefined) {
    const text = (patch.caption ?? "").trim();
    next.caption = text.slice(0, 40) || null;
  }
  if (patch.badge !== undefined) {
    const text = (patch.badge ?? "").trim();
    next.badge = text.slice(0, 40) || null;
  }
  if (Object.keys(next).length === 0) return { ok: true as const };
  const { error } = await ctx.api.from("hero_spots").update(next).eq("id", heroId);
  if (error) return { ok: false as const, error: error.message };
  await touchMenu(ctx.menuId);
  return { ok: true as const };
}

export async function deleteHero(heroId: string, menuId?: string) {
  const ctx = await mutationContext(menuId);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.api.from("hero_spots").delete().eq("id", heroId);
  if (error) return { ok: false as const, error: error.message };
  await touchMenu(ctx.menuId);
  revalidatePath("/admin");
  revalidatePath("/admin/media");
  return { ok: true as const };
}

export async function publishMenu() {
  const result = await buildAndPublishSnapshot();
  if (!result.ok) return result;
  revalidatePath("/admin");
  revalidatePath("/admin/layout");
  revalidatePath("/admin/branding");
  revalidatePath(`/v/${result.snapshot.store.slug}`);
  return { ok: true as const };
}

export async function signOut() {
  const auth = await requireUser();
  if (auth.supabase) {
    await auth.supabase.auth.signOut();
  }
  revalidatePath("/admin");
}
