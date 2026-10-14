import { orientationFromRecord, type StageOrientation } from "@/lib/display/stage";
import { hydrateCatalogIfEmpty } from "@/lib/menu/hydrate";
import { assembleMenuForStore, publishSnapshotForStore } from "@/lib/menu/publish";
import type { LayoutKey, MenuSnapshot, MenuTheme } from "@/lib/menu/types";
import { asSectionComponent } from "@/lib/menu/sections";
import { loadLayoutPlan } from "@/lib/menu/layout-sections";
import { resolveHeaderIcon } from "@/lib/menu/list-icons";
import type { LayoutPlanSection } from "@/lib/menu/layout-plan";
import {
  claimInvites,
  listStoreMemberships,
  readPreferredStoreId,
  type StoreMembership,
} from "@/lib/store/session";
import { apiFrom, createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminItem = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_available: boolean;
  sort_order: number;
  images: Array<{ id: string; url: string; mediaId: string | null }>;
};

export type AdminSection = {
  id: string;
  name: string;
  kind: string;
  component: string;
  columns: number;
  headerIcon?: string;
  layoutSectionId?: string;
  items: AdminItem[];
};

export type AdminTier = {
  id: string;
  label: string;
  price: number;
};

export type AdminHero = {
  id: string;
  caption: string | null;
  badge: string | null;
  image_url: string | null;
  variant: string | null;
  media_id: string | null;
};

export type AdminMedia = {
  id: string;
  blob_url: string;
  blob_pathname: string;
  mime: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  created_at: string;
};

export type AdminBranding = {
  title: string;
  tagline: string;
  ribbon: string;
  closing: string;
  logoUrl: string | null;
  theme: MenuTheme;
};

export type AdminCatalog = {
  store: StoreMembership;
  stores: StoreMembership[];
  menu: {
    id: string;
    updated_at: string;
    is_published: boolean;
    layout_key: LayoutKey;
    orientation: StageOrientation;
  };
  email: string;
  branding: AdminBranding;
  layoutSections: LayoutPlanSection[];
  sections: AdminSection[];
  tiers: AdminTier[];
  heroes: AdminHero[];
  media: AdminMedia[];
  snapshotUpdatedAt: string | null;
  tvPath: string;
};

const DEFAULT_THEME: MenuTheme = {
  primary: "#e11d48",
  secondary: "#2563eb",
  footer: "#18181b",
  gold: "#f59e0b",
  surface: "#ffffff",
  ink: "#18181b",
};

function asTheme(value: unknown): MenuTheme {
  if (!value || typeof value !== "object") return DEFAULT_THEME;
  const theme = value as Record<string, unknown>;
  return {
    primary: typeof theme.primary === "string" ? theme.primary : DEFAULT_THEME.primary,
    secondary: typeof theme.secondary === "string" ? theme.secondary : DEFAULT_THEME.secondary,
    footer: typeof theme.footer === "string" ? theme.footer : DEFAULT_THEME.footer,
    gold: typeof theme.gold === "string" ? theme.gold : DEFAULT_THEME.gold,
    surface: typeof theme.surface === "string" ? theme.surface : DEFAULT_THEME.surface,
    ink: typeof theme.ink === "string" ? theme.ink : DEFAULT_THEME.ink,
  };
}

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "missing-env" as const, supabase: null, user: null };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "unauthenticated" as const, supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

export async function loadAdminCatalog(): Promise<
  { ok: true; catalog: AdminCatalog } | { ok: false; error: string }
> {
  const auth = await requireUser();
  if (auth.error === "missing-env") {
    return {
      ok: false,
      error:
        "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.",
    };
  }
  if (auth.error || !auth.supabase || !auth.user) {
    return { ok: false, error: "unauthenticated" };
  }

  const api = apiFrom(auth.supabase);
  await claimInvites(api);
  const memberships = await listStoreMemberships(api, auth.user.id);
  const preferred = await readPreferredStoreId();
  const store = memberships.find((entry) => entry.id === preferred) ?? memberships[0];
  if (!store) {
    return { ok: false, error: "needs_store" };
  }
  const menuId = await hydrateCatalogIfEmpty(api, store.id);

  const [
    { data: menuRow },
    { data: sections },
    { data: tiers },
    { data: heroes, error: heroesError },
    { data: media },
    { data: snapshot },
  ] = await Promise.all([
      api
        .from("menus")
        .select("id, updated_at, is_published, layout_key, title, tagline, ribbon, closing, theme")
        .eq("id", menuId)
        .single(),
      api
        .from("menu_sections")
        .select("id, name, kind, columns, sort_order, component, header_icon")
        .eq("menu_id", menuId)
        .order("sort_order"),
      api
        .from("price_tiers")
        .select("id, label, price, sort_order")
        .eq("menu_id", menuId)
        .order("sort_order"),
      api
        .from("hero_spots")
        .select("id, caption, badge, image_url, variant, media_id, sort_order")
        .eq("menu_id", menuId)
        .order("sort_order"),
      api
        .from("media_assets")
        .select("id, blob_url, blob_pathname, mime, width, height, alt, created_at")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false }),
      api
        .from("menu_snapshots")
        .select("updated_at")
        .eq("store_id", store.id)
        .maybeSingle(),
    ]);

  const menu = menuRow;
  if (!menu) return { ok: false, error: "No se encontró el menú." };

  let sectionRows = sections ?? [];
  if (!sections) {
    const withComponent = await api
      .from("menu_sections")
      .select("id, name, kind, columns, sort_order, component")
      .eq("menu_id", menuId)
      .order("sort_order");
    if (withComponent.data) {
      sectionRows = withComponent.data.map((section) => ({ ...section, header_icon: null }));
    } else {
      const fallback = await api
        .from("menu_sections")
        .select("id, name, kind, columns, sort_order")
        .eq("menu_id", menuId)
        .order("sort_order");
      sectionRows = (fallback.data ?? []).map((section) => ({
        ...section,
        component: "products",
        header_icon: null,
      }));
    }
  }

  let heroRows = heroes ?? [];
  if (heroesError) {
    const fallback = await api
      .from("hero_spots")
      .select("id, caption, badge, image_url, variant, sort_order")
      .eq("menu_id", menuId)
      .order("sort_order");
    heroRows = (fallback.data ?? []).map((hero) => ({ ...hero, media_id: null }));
  }

  const sectionIds = sectionRows.map((section) => section.id);
  const { data: items } = sectionIds.length
    ? await api
        .from("menu_items")
        .select("id, section_id, name, description, price, is_available, sort_order")
        .in("section_id", sectionIds)
        .order("sort_order")
    : { data: [] };

  let itemRows = items ?? [];
  if (sectionIds.length && !items) {
    const fallback = await api
      .from("menu_items")
      .select("id, section_id, name, is_available, sort_order")
      .in("section_id", sectionIds)
      .order("sort_order");
    itemRows = (fallback.data ?? []).map((item) => ({
      ...item,
      description: null,
      price: null,
    }));
  }

  const itemIds = itemRows.map((item) => item.id as string);
  let itemMedia: Array<{
    id: string;
    item_id: string;
    image_url: string;
    media_id: string | null;
    sort_order: number;
  }> = [];
  if (itemIds.length) {
    const gallery = await api
      .from("menu_item_media")
      .select("id, item_id, image_url, media_id, sort_order")
      .in("item_id", itemIds)
      .order("sort_order");
    if (!gallery.error) itemMedia = gallery.data ?? [];
  }

  const layoutSections = await loadLayoutPlan(
    api,
    menuId,
    menu.theme,
    sectionRows.map((section) => ({
      id: section.id as string,
      component: "component" in section ? String(section.component ?? "products") : "products",
    })),
  );
  const sectionParent = new Map(
    layoutSections.flatMap((band) => band.componentIds.map((id) => [id, band.id] as const)),
  );

  return {
    ok: true,
    catalog: {
      store,
      stores: memberships,
      menu: {
        id: menu.id,
        updated_at: menu.updated_at,
        is_published: menu.is_published,
        layout_key: (menu.layout_key as LayoutKey) || "classic-split",
        orientation: orientationFromRecord(menu),
      },
      email: auth.user.email ?? "",
      branding: {
        title: menu.title ?? store.name,
        tagline: menu.tagline ?? "",
        ribbon: menu.ribbon ?? "",
        closing: menu.closing ?? "",
        logoUrl: store.logoUrl,
        theme: asTheme(menu.theme),
      },
      layoutSections,
      sections: sectionRows.map((section) => ({
        id: section.id,
        name: section.name,
        kind: section.kind,
        component: asSectionComponent(
          "component" in section ? String(section.component ?? "products") : "products",
        ),
        columns: section.columns,
        headerIcon: resolveHeaderIcon(
          {
            id: section.id as string,
            kind: section.kind as string,
            header_icon: "header_icon" in section ? section.header_icon : null,
          },
          menu.theme,
        ),
        layoutSectionId: sectionParent.get(section.id as string),
            items: itemRows
          .filter((item) => item.section_id === section.id)
          .map((item) => ({
            id: item.id,
            name: item.name,
            description: "description" in item ? (item.description as string | null) : null,
            price:
              "price" in item && item.price != null && item.price !== ""
                ? Number(item.price)
                : null,
            is_available: item.is_available,
            sort_order: item.sort_order,
            images: itemMedia
              .filter((entry) => entry.item_id === item.id)
              .map((entry) => ({
                id: entry.id,
                url: entry.image_url,
                mediaId: entry.media_id,
              })),
          })),
      })),
      tiers: (tiers ?? []).map((tier) => ({
        id: tier.id,
        label: tier.label,
        price: Number(tier.price),
      })),
      heroes: heroRows.map((hero) => ({
        id: hero.id,
        caption: hero.caption,
        badge: hero.badge,
        image_url: hero.image_url,
        variant: hero.variant,
        media_id: hero.media_id,
      })),
      media: (media ?? []).map((asset) => ({
        id: asset.id,
        blob_url: asset.blob_url,
        blob_pathname: asset.blob_pathname,
        mime: asset.mime,
        width: asset.width,
        height: asset.height,
        alt: asset.alt,
        created_at: asset.created_at,
      })),
      snapshotUpdatedAt: snapshot?.updated_at ?? null,
      tvPath: `/v/${store.slug}`,
    },
  };
}

export async function buildAndPublishSnapshot(): Promise<
  { ok: true; snapshot: MenuSnapshot } | { ok: false; error: string }
> {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return loaded;

  const auth = await requireUser();
  if (auth.error || !auth.supabase) {
    return { ok: false, error: "unauthenticated" };
  }

  return publishSnapshotForStore(
    apiFrom(auth.supabase),
    loaded.catalog.store.id,
    loaded.catalog.menu.id,
  );
}

export async function getDraftMenuForViewer(slug: string): Promise<
  | { ok: true; snapshot: MenuSnapshot; error?: undefined }
  | { ok: false; error: "unauthenticated" | "forbidden" | "missing" }
> {
  const auth = await requireUser();
  if (auth.error === "unauthenticated" || !auth.supabase || !auth.user) {
    return { ok: false, error: "unauthenticated" };
  }
  if (auth.error) return { ok: false, error: "missing" };

  const api = apiFrom(auth.supabase);
  await claimInvites(api);
  const stores = await listStoreMemberships(api, auth.user.id);
  const store = stores.find((entry) => entry.slug === slug);
  if (!store) return { ok: false, error: "forbidden" };

  const assembled = await assembleMenuForStore(api, store.id, 0);
  if (!assembled.ok) return { ok: false, error: "missing" };
  return { ok: true, snapshot: assembled.snapshot };
}

export async function touchMenu(menuId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.supabase) return;
  await apiFrom(auth.supabase)
    .from("menus")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", menuId);
}
