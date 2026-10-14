import { LA_MICHOACANA_SNAPSHOT } from "@/lib/menu/seeds/la-michoacana";
import { makeStarterSnapshot } from "@/lib/menu/seeds/starter";
import { saveLayoutPlan } from "@/lib/menu/layout-sections";
import { ensureLayoutPlan, newLayoutSectionId } from "@/lib/menu/layout-plan";
import { asListIcon, defaultListIcon, missingIconColumn, themeWithSectionIcon } from "@/lib/menu/list-icons";
import { resolveStoreMenuId } from "@/lib/menu/store-menu";
import type { MenuSnapshot } from "@/lib/menu/types";
import { apiFrom, createSupabaseServerClient } from "@/lib/supabase/server";

type ApiClient = ReturnType<typeof apiFrom>;

async function snapshotForStore(api: ApiClient, storeId: string): Promise<MenuSnapshot> {
  const { data: store } = await api
    .from("stores")
    .select("slug, name")
    .eq("id", storeId)
    .maybeSingle();
  if (store?.slug === "la-michoacana") return LA_MICHOACANA_SNAPSHOT;
  return makeStarterSnapshot(store?.name ?? "Mi negocio");
}

export async function hydrateCatalogIfEmpty(
  api: ApiClient,
  storeId: string,
  snapshot?: MenuSnapshot,
) {
  const seed = snapshot ?? (await snapshotForStore(api, storeId));
  const existingId = await resolveStoreMenuId(api, storeId);

  if (existingId) {
    const { count } = await api
      .from("menu_sections")
      .select("id", { count: "exact", head: true })
      .eq("menu_id", existingId);
    if ((count ?? 0) > 0) return existingId;
  }

  const insertedMenu = existingId
    ? { data: { id: existingId }, error: null }
    : await api
        .from("menus")
        .insert({
          store_id: storeId,
          name: seed.store.name,
          layout_key: seed.layoutKey,
          orientation: seed.orientation,
          theme: seed.theme,
          title: seed.brand.title,
          tagline: seed.brand.subtitle,
          ribbon: seed.brand.ribbon,
          closing: seed.closing,
          is_published: false,
        })
        .select("id")
        .single();

  let menu = insertedMenu.data;
  let menuError = insertedMenu.error;
  if (menuError?.message.toLowerCase().includes("orientation") && !existingId) {
    const retry = await api
      .from("menus")
      .insert({
        store_id: storeId,
        name: seed.store.name,
        layout_key: seed.layoutKey,
        theme: { ...seed.theme, orientation: seed.orientation },
        title: seed.brand.title,
        tagline: seed.brand.subtitle,
        ribbon: seed.brand.ribbon,
        closing: seed.closing,
        is_published: false,
      })
      .select("id")
      .single();
    menu = retry.data;
    menuError = retry.error;
  }

  if (menuError || !menu) {
    throw new Error(menuError?.message ?? "No se pudo crear el menú");
  }

  const menuId = menu.id as string;

  const { error: tierError } = await api.from("price_tiers").insert(
    seed.priceTiers.map((tier, index) => ({
      menu_id: menuId,
      label: tier.label,
      price: tier.price,
      scoop_count: tier.scoops,
      scoop_colors: tier.scoopColors,
      sort_order: index,
    })),
  );
  if (tierError) throw new Error(tierError.message);

  const { error: heroError } = await api.from("hero_spots").insert(
    seed.heroes.map((hero, index) => ({
      menu_id: menuId,
      caption: hero.caption ?? null,
      badge: hero.badge ?? null,
      image_url: hero.imageUrl ?? null,
      variant: hero.variant,
      animation_preset: hero.animation,
      sort_order: index,
    })),
  );
  if (heroError) throw new Error(heroError.message);

  const { error: featureError } = await api.from("menu_features").insert(
    seed.features.map((feature, index) => ({
      menu_id: menuId,
      icon: feature.icon,
      label: feature.label,
      sort_order: index,
    })),
  );
  if (featureError) throw new Error(featureError.message);

  const seedIds = new Map<string, string>();
  let theme: Record<string, unknown> =
    seed.theme && typeof seed.theme === "object" ? { ...seed.theme } : {};
  for (const [index, section] of seed.sections.entries()) {
    const inserted = await api
      .from("menu_sections")
      .insert({
        menu_id: menuId,
        name: section.name,
        kind: section.kind,
        columns: section.columns,
        component: section.component ?? "products",
        sort_order: index,
      })
      .select("id")
      .single();
    let sectionRow = inserted.data;
    let sectionError = inserted.error;
    if (sectionError?.message.includes("component")) {
      const retry = await api
        .from("menu_sections")
        .insert({
          menu_id: menuId,
          name: section.name,
          kind: section.kind,
          columns: section.columns,
          sort_order: index,
        })
        .select("id")
        .single();
      sectionRow = retry.data;
      sectionError = retry.error;
    }
    if (sectionError || !sectionRow) {
      throw new Error(sectionError?.message ?? "No se pudo crear la sección");
    }
    seedIds.set(section.id, sectionRow.id as string);
    const headerIcon = asListIcon(section.headerIcon, defaultListIcon(section.kind));
    theme = themeWithSectionIcon(theme, sectionRow.id as string, headerIcon);
    const iconWrite = await api
      .from("menu_sections")
      .update({ header_icon: headerIcon })
      .eq("id", sectionRow.id);
    if (iconWrite.error && !missingIconColumn(iconWrite.error)) {
      throw new Error(iconWrite.error.message);
    }

    const { error: itemError } = await api.from("menu_items").insert(
      section.items.map((item, itemIndex) => ({
        section_id: sectionRow.id,
        name: item.name,
        is_available: item.available,
        description: item.description ?? null,
        price: item.price ?? null,
        animation_preset: item.animation ?? "cascade",
        sort_order: itemIndex,
      })),
    );
    if (itemError) throw new Error(itemError.message);
  }

  const remapped = (seed.layoutSections ?? []).map((band) => ({
    id: newLayoutSectionId(),
    name: band.name,
    componentIds: band.componentIds.flatMap((id) => {
      const next = seedIds.get(id);
      return next ? [next] : [];
    }),
  }));
  await saveLayoutPlan(
    api,
    menuId,
    theme,
    ensureLayoutPlan(
      remapped.flatMap((band) => band.componentIds),
      remapped,
    ),
  );

  return menuId;
}

export async function getHydratedApi() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  return { supabase, api: apiFrom(supabase) };
}
