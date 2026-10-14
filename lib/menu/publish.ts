import { assembleSnapshot } from "@/lib/menu/assemble";
import { loadLayoutPlan } from "@/lib/menu/layout-sections";
import { markOnlyMenuPublished, resolveStoreMenuId } from "@/lib/menu/store-menu";
import type { MenuSnapshot } from "@/lib/menu/types";
import type { ApiClient } from "@/lib/supabase/server";

export async function assembleMenuForStore(
  api: ApiClient,
  storeId: string,
  revision: number,
  menuId?: string,
): Promise<{ ok: true; snapshot: MenuSnapshot; menuId: string } | { ok: false; error: string }> {
  const withLogo = await api
    .from("stores")
    .select("id, slug, name, locale, logo_url")
    .eq("id", storeId)
    .maybeSingle();
  let store = withLogo.data ?? null;
  if (withLogo.error) {
    const fallback = await api
      .from("stores")
      .select("id, slug, name, locale")
      .eq("id", storeId)
      .maybeSingle();
    store = fallback.data ? { ...fallback.data, logo_url: null } : null;
  }

  const resolvedMenuId = menuId ?? (await resolveStoreMenuId(api, storeId));
  if (!store || !resolvedMenuId) return { ok: false, error: "No se pudo armar el menú." };

  const { data: menu } = await api
    .from("menus")
    .select("*")
    .eq("id", resolvedMenuId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!menu) return { ok: false, error: "No se pudo armar el menú." };

  const [
    { data: tiers },
    { data: heroes },
    { data: sections },
    { data: features },
  ] = await Promise.all([
    api.from("price_tiers").select("*").eq("menu_id", menu.id).order("sort_order"),
    api.from("hero_spots").select("*").eq("menu_id", menu.id).order("sort_order"),
    api.from("menu_sections").select("*").eq("menu_id", menu.id).order("sort_order"),
    api.from("menu_features").select("*").eq("menu_id", menu.id).order("sort_order"),
  ]);

  const sectionIds = (sections ?? []).map((section) => section.id);
  const { data: items } = sectionIds.length
    ? await api.from("menu_items").select("*").in("section_id", sectionIds).order("sort_order")
    : { data: [] };

  const itemIds = (items ?? []).map((item) => item.id as string);
  let itemMedia: Array<{
    id: string;
    item_id: string;
    image_url: string;
    sort_order: number;
  }> = [];
  if (itemIds.length) {
    const gallery = await api
      .from("menu_item_media")
      .select("id, item_id, image_url, sort_order")
      .in("item_id", itemIds)
      .order("sort_order");
    if (!gallery.error) itemMedia = gallery.data ?? [];
  }

  const layoutSections = await loadLayoutPlan(
    api,
    menu.id as string,
    menu.theme,
    (sections ?? []).map((section) => ({
      id: section.id as string,
      component: (section.component as string | null) ?? "products",
    })),
  );

  return {
    ok: true,
    menuId: menu.id as string,
    snapshot: assembleSnapshot({
      store,
      menu,
      tiers: tiers ?? [],
      heroes: heroes ?? [],
      sections: sections ?? [],
      items: items ?? [],
      itemMedia,
      features: features ?? [],
      layoutSections,
      revision,
    }),
  };
}

export async function publishSnapshotForStore(
  api: ApiClient,
  storeId: string,
  menuId?: string,
): Promise<{ ok: true; snapshot: MenuSnapshot } | { ok: false; error: string }> {
  const { data: currentSnap } = await api
    .from("menu_snapshots")
    .select("revision")
    .eq("store_id", storeId)
    .maybeSingle();

  const assembled = await assembleMenuForStore(
    api,
    storeId,
    (currentSnap?.revision ?? 0) + 1,
    menuId,
  );
  if (!assembled.ok) return assembled;

  const published = await markOnlyMenuPublished(api, storeId, assembled.menuId);
  if (!published.ok) return published;

  const { snapshot } = assembled;
  const { error: upsertError } = await api.from("menu_snapshots").upsert(
    {
      store_id: storeId,
      store_slug: snapshot.store.slug,
      revision: snapshot.revision,
      payload: snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id" },
  );
  if (upsertError) return { ok: false, error: upsertError.message };

  return { ok: true, snapshot };
}