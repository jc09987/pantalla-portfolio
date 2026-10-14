import { upsertMediaAsset } from "@/lib/blob/record";
import {
  MAX_IMAGE_BYTES,
  extensionForMime,
  isAllowedImageType,
} from "@/lib/blob/rules";
import { publishSnapshotForStore } from "@/lib/menu/publish";
import { resolveStoreMenuId } from "@/lib/menu/store-menu";
import type { SectionKind } from "@/lib/menu/types";
import {
  describeItems,
  matchItems,
  matchTier,
  type MatchableItem,
  type MatchableTier,
} from "@/lib/n8n/match";
import { HELP_REPLY, type ParsedCommand } from "@/lib/n8n/parse";
import type { ApiClient } from "@/lib/supabase/server";
import { putStoreBlob } from "@/lib/blob/put";

export type ApplyResult = {
  status: "applied" | "ambiguous" | "help" | "unknown" | "error";
  reply: string;
  published: boolean;
};

type MenuContext = {
  storeId: string;
  storeSlug: string;
  items: MatchableItem[];
  tiers: MatchableTier[];
  sections: Array<{ id: string; name: string; kind: SectionKind; component: string }>;
};

async function loadMenu(api: ApiClient, storeId: string): Promise<MenuContext | null> {
  const [{ data: store }, menuId] = await Promise.all([
    api.from("stores").select("id, slug").eq("id", storeId).single(),
    resolveStoreMenuId(api, storeId),
  ]);
  if (!store || !menuId) return null;

  const [{ data: sections }, { data: tiers }] = await Promise.all([
    api
      .from("menu_sections")
      .select("id, name, kind, component, sort_order")
      .eq("menu_id", menuId)
      .order("sort_order"),
    api
      .from("price_tiers")
      .select("id, label, price, scoop_count")
      .eq("menu_id", menuId)
      .order("sort_order"),
  ]);

  const sectionRows = sections ?? [];
  const sectionIds = sectionRows.map((section) => section.id);
  const { data: items } = sectionIds.length
    ? await api
        .from("menu_items")
        .select("id, section_id, name, is_available")
        .in("section_id", sectionIds)
    : { data: [] };

  const sectionById = new Map(sectionRows.map((section) => [section.id, section]));

  return {
    storeId: store.id,
    storeSlug: store.slug,
    sections: sectionRows.map((section) => ({
      id: section.id,
      name: section.name,
      kind: section.kind as SectionKind,
      component: typeof section.component === "string" ? section.component : "products",
    })),
    tiers: (tiers ?? []).map((tier) => ({
      id: tier.id,
      label: tier.label,
      scoop_count: tier.scoop_count,
      price: Number(tier.price),
    })),
    items: (items ?? []).flatMap((item) => {
      const section = sectionById.get(item.section_id);
      if (!section) return [];
      return [
        {
          id: item.id,
          name: item.name,
          section_id: item.section_id,
          section_name: section.name,
          kind: section.kind as SectionKind,
          is_available: item.is_available,
        },
      ];
    }),
  };
}

function askWhich(items: MatchableItem[]) {
  return `¿${describeItems(items)}?`;
}

async function publish(api: ApiClient, storeId: string) {
  const result = await publishSnapshotForStore(api, storeId);
  if (!result.ok) return { published: false as const, error: result.error };
  return { published: true as const };
}

async function uploadPhoto(input: {
  storeSlug: string;
  mime: string;
  base64: string;
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false as const, error: "Las fotos no están configuradas todavía." };
  }
  const mime = input.mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!isAllowedImageType(mime)) {
    return { ok: false as const, error: "La foto debe ser JPEG, PNG o WebP." };
  }
  const raw = input.base64.replace(/^data:[^;]+;base64,/, "");
  const bytes = Buffer.from(raw, "base64");
  if (!bytes.length) return { ok: false as const, error: "No pude leer la imagen." };
  if (bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false as const, error: "La foto no puede pesar más de 8 MB." };
  }
  const ext = extensionForMime(mime);
  const pathname = `stores/${input.storeSlug}/media/n8n-${Date.now()}.${ext}`;
  const blob = await putStoreBlob(pathname, bytes, mime);
  return { ok: true as const, url: blob.url, pathname: blob.pathname, mime };
}

export async function applyParsedCommand(
  api: ApiClient,
  storeId: string,
  command: ParsedCommand,
  media?: { base64?: string; mime?: string },
): Promise<ApplyResult> {
  if (command.type === "help") {
    return { status: "help", reply: HELP_REPLY, published: false };
  }
  if (command.type === "unknown") {
    return {
      status: "unknown",
      reply: `No entendí el mensaje.\n${HELP_REPLY}`,
      published: false,
    };
  }

  const menu = await loadMenu(api, storeId);
  if (!menu) {
    return { status: "error", reply: "No hay un menú para esta tienda.", published: false };
  }

  if (command.type === "set_available" || command.type === "hide_item") {
    const available = command.type === "set_available" ? command.available : false;
    const match = matchItems(menu.items, command.query, command.kind);
    if (match.status === "none") {
      return { status: "unknown", reply: `No encontré «${command.query}».`, published: false };
    }
    if (match.status === "ambiguous") {
      return { status: "ambiguous", reply: askWhich(match.items), published: false };
    }
    const { error } = await api
      .from("menu_items")
      .update({ is_available: available })
      .eq("id", match.item.id);
    if (error) return { status: "error", reply: error.message, published: false };
    const published = await publish(api, storeId);
    if (!published.published) {
      return { status: "error", reply: published.error, published: false };
    }
    const verb = available ? "ya está disponible" : "quedó agotado";
    return {
      status: "applied",
      reply: `${match.item.name} (${match.item.kind}) ${verb}.`,
      published: true,
    };
  }

  if (command.type === "set_price") {
    const match = matchTier(menu.tiers, command);
    if (match.status === "ambiguous") {
      return {
        status: "ambiguous",
        reply: `¿${match.tiers.map((tier) => tier.label).join(" o ")}?`,
        published: false,
      };
    }
    if (match.status === "none" && command.labelQuery) {
      const promoIds = new Set(
        menu.sections.filter((section) => section.component === "promo").map((section) => section.id),
      );
      const promoMatch = matchItems(
        menu.items.filter((item) => promoIds.has(item.section_id)),
        command.labelQuery,
      );
      if (promoMatch.status === "ambiguous") {
        return { status: "ambiguous", reply: askWhich(promoMatch.items), published: false };
      }
      if (promoMatch.status === "one") {
        const { error } = await api
          .from("menu_items")
          .update({ price: command.price.toFixed(2) })
          .eq("id", promoMatch.item.id);
        if (error) return { status: "error", reply: error.message, published: false };
        const published = await publish(api, storeId);
        if (!published.published) {
          return { status: "error", reply: published.error, published: false };
        }
        return {
          status: "applied",
          reply: `${promoMatch.item.name} quedó en $${command.price.toFixed(2)}.`,
          published: true,
        };
      }
    }
    if (match.status !== "one") {
      return { status: "unknown", reply: "No encontré ese precio.", published: false };
    }
    const { error } = await api
      .from("price_tiers")
      .update({ price: command.price.toFixed(2) })
      .eq("id", match.tier.id);
    if (error) return { status: "error", reply: error.message, published: false };
    const published = await publish(api, storeId);
    if (!published.published) {
      return { status: "error", reply: published.error, published: false };
    }
    return {
      status: "applied",
      reply: `${match.tier.label} quedó en $${command.price.toFixed(2)}.`,
      published: true,
    };
  }

  if (command.type === "add_item") {
    const existing = matchItems(menu.items, command.name, command.kind);
    if (existing.status === "one") {
      return {
        status: "applied",
        reply: `${existing.item.name} ya está en ${existing.item.section_name}.`,
        published: false,
      };
    }
    const section =
      menu.sections.find((entry) => entry.kind === (command.kind ?? "agua")) ??
      menu.sections[0];
    if (!section) {
      return { status: "error", reply: "No hay secciones en el menú.", published: false };
    }
    const inSection = menu.items.filter((item) => item.section_id === section.id);
    const { error } = await api.from("menu_items").insert({
      section_id: section.id,
      name: command.name.replace(/\s+/g, " "),
      is_available: true,
      animation_preset: "cascade",
      sort_order: inSection.length,
    });
    if (error) return { status: "error", reply: error.message, published: false };
    const published = await publish(api, storeId);
    if (!published.published) {
      return { status: "error", reply: published.error, published: false };
    }
    return {
      status: "applied",
      reply: `Agregué ${command.name} en ${section.name}.`,
      published: true,
    };
  }

  if (!media?.base64) {
    return {
      status: "unknown",
      reply: `Envía la foto junto con: foto ${command.query}`,
      published: false,
    };
  }
  const match = matchItems(menu.items, command.query, command.kind);
  if (match.status === "none") {
    return { status: "unknown", reply: `No encontré «${command.query}».`, published: false };
  }
  if (match.status === "ambiguous") {
    return { status: "ambiguous", reply: askWhich(match.items), published: false };
  }
  const uploaded = await uploadPhoto({
    storeSlug: menu.storeSlug,
    mime: media.mime || "image/jpeg",
    base64: media.base64,
  });
  if (!uploaded.ok) {
    return { status: "error", reply: uploaded.error, published: false };
  }
  const { data: saved, error: mediaError } = await upsertMediaAsset(api, {
    storeId,
    blobUrl: uploaded.url,
    blobPathname: uploaded.pathname,
    mime: uploaded.mime,
    alt: match.item.name,
  });
  if (mediaError) return { status: "error", reply: mediaError.message, published: false };
  const itemPatch: { image_url: string; media_id?: string } = { image_url: uploaded.url };
  if (saved?.id) itemPatch.media_id = saved.id;
  let { error: itemError } = await api
    .from("menu_items")
    .update(itemPatch)
    .eq("id", match.item.id);
  if (itemError?.message.includes("media_id")) {
    const retry = await api
      .from("menu_items")
      .update({ image_url: uploaded.url })
      .eq("id", match.item.id);
    itemError = retry.error;
  }
  if (itemError) return { status: "error", reply: itemError.message, published: false };
  if (saved?.id) {
    await api.from("menu_item_media").insert({
      item_id: match.item.id,
      media_id: saved.id,
      image_url: uploaded.url,
      sort_order: 0,
    });
  }
  const published = await publish(api, storeId);
  if (!published.published) {
    return { status: "error", reply: published.error, published: false };
  }
  return {
    status: "applied",
    reply: `Guardé la foto de ${match.item.name}.`,
    published: true,
  };
}