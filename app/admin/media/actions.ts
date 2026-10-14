"use server";

import { upsertMediaAsset } from "@/lib/blob/record";
import { loadAdminCatalog, requireUser, touchMenu } from "@/lib/menu/catalog";
import { apiFrom, type ApiClient } from "@/lib/supabase/server";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

function revalidateMedia(slug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/media");
  revalidatePath(`/v/${slug}`);
}

async function adminApi() {
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) return { ok: false as const, error: loaded.error };
  const auth = await requireUser();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: "Sesión expirada." };
  }
  return {
    ok: true as const,
    api: apiFrom(auth.supabase),
    catalog: loaded.catalog,
  };
}

export async function recordUploadedAsset(input: {
  url: string;
  pathname: string;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}) {
  const ctx = await adminApi();
  if (!ctx.ok) return ctx;

  const { data, error } = await upsertMediaAsset(ctx.api, {
    storeId: ctx.catalog.store.id,
    blobUrl: input.url,
    blobPathname: input.pathname,
    mime: input.mime,
    width: input.width,
    height: input.height,
    alt: input.alt,
  });
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "No se pudo guardar la foto." };
  }

  revalidateMedia(ctx.catalog.store.slug);
  return { ok: true as const, id: data.id as string };
}

export async function updateMediaAlt(mediaId: string, alt: string) {
  const ctx = await adminApi();
  if (!ctx.ok) return ctx;
  const label = alt.trim().slice(0, 80);
  const { error } = await ctx.api
    .from("media_assets")
    .update({ alt: label || null })
    .eq("id", mediaId)
    .eq("store_id", ctx.catalog.store.id);
  if (error) return { ok: false as const, error: error.message };
  revalidateMedia(ctx.catalog.store.slug);
  return { ok: true as const };
}

export async function assignMediaToHero(heroId: string, mediaId: string) {
  const ctx = await adminApi();
  if (!ctx.ok) return ctx;

  const { data: asset, error: assetError } = await ctx.api
    .from("media_assets")
    .select("id, blob_url")
    .eq("id", mediaId)
    .eq("store_id", ctx.catalog.store.id)
    .single();
  if (assetError || !asset) {
    return { ok: false as const, error: "No se encontró la foto." };
  }

  const hero = ctx.catalog.heroes.find((entry) => entry.id === heroId);
  if (!hero) return { ok: false as const, error: "No se encontró el héroe." };

  const { error } = await ctx.api
    .from("hero_spots")
    .update({ media_id: asset.id, image_url: asset.blob_url })
    .eq("id", heroId);
  if (error?.message.includes("media_id")) {
    const retry = await ctx.api
      .from("hero_spots")
      .update({ image_url: asset.blob_url })
      .eq("id", heroId);
    if (retry.error) return { ok: false as const, error: retry.error.message };
  } else if (error) {
    return { ok: false as const, error: error.message };
  }

  await touchMenu(ctx.catalog.menu.id);
  revalidateMedia(ctx.catalog.store.slug);
  return { ok: true as const };
}

export async function clearHeroMedia(heroId: string) {
  const ctx = await adminApi();
  if (!ctx.ok) return ctx;
  const hero = ctx.catalog.heroes.find((entry) => entry.id === heroId);
  if (!hero) return { ok: false as const, error: "No se encontró el héroe." };

  const { error } = await ctx.api
    .from("hero_spots")
    .update({ media_id: null, image_url: null })
    .eq("id", heroId);
  if (error?.message.includes("media_id")) {
    const retry = await ctx.api.from("hero_spots").update({ image_url: null }).eq("id", heroId);
    if (retry.error) return { ok: false as const, error: retry.error.message };
  } else if (error) {
    return { ok: false as const, error: error.message };
  }

  await touchMenu(ctx.catalog.menu.id);
  revalidateMedia(ctx.catalog.store.slug);
  return { ok: true as const };
}

export async function deleteMediaAsset(mediaId: string) {
  const ctx = await adminApi();
  if (!ctx.ok) return ctx;

  const { data: asset, error: assetError } = await ctx.api
    .from("media_assets")
    .select("id, blob_url, blob_pathname")
    .eq("id", mediaId)
    .eq("store_id", ctx.catalog.store.id)
    .single();
  if (assetError || !asset) {
    return { ok: false as const, error: "No se encontró la foto." };
  }

  await ctx.api.from("stores").update({ logo_url: null }).eq("logo_url", asset.blob_url);
  await ctx.api.from("hero_spots").update({ image_url: null }).eq("image_url", asset.blob_url);
  await ctx.api.from("menu_items").update({ image_url: null }).eq("image_url", asset.blob_url);
  await ctx.api.from("price_tiers").update({ image_url: null }).eq("image_url", asset.blob_url);
  await ctx.api.from("hero_spots").update({ media_id: null, image_url: null }).eq("media_id", asset.id);
  await ctx.api.from("menu_items").update({ media_id: null, image_url: null }).eq("media_id", asset.id);
  await ctx.api.from("price_tiers").update({ media_id: null, image_url: null }).eq("media_id", asset.id);
  await ctx.api.from("menu_item_media").delete().eq("media_id", asset.id);
  await ctx.api.from("menu_item_media").delete().eq("image_url", asset.blob_url);

  try {
    await del(asset.blob_url);
  } catch {
    try {
      await del(asset.blob_pathname);
    } catch {
      /* Blob already gone; still drop the index row. */
    }
  }

  const { error } = await ctx.api
    .from("media_assets")
    .delete()
    .eq("id", asset.id)
    .eq("store_id", ctx.catalog.store.id);
  if (error) return { ok: false as const, error: error.message };

  await touchMenu(ctx.catalog.menu.id);
  revalidateMedia(ctx.catalog.store.slug);
  return { ok: true as const };
}

const MAX_ITEM_IMAGES = 8;

async function syncItemCover(api: ApiClient, itemId: string) {
  const { data } = await api
    .from("menu_item_media")
    .select("image_url, media_id")
    .eq("item_id", itemId)
    .order("sort_order")
    .limit(1);
  const cover = data?.[0];
  const patch: { image_url: string | null; media_id?: string | null } = {
    image_url: cover?.image_url ?? null,
    media_id: cover?.media_id ?? null,
  };
  const { error } = await api.from("menu_items").update(patch).eq("id", itemId);
  if (error?.message.includes("media_id")) {
    await api.from("menu_items").update({ image_url: patch.image_url }).eq("id", itemId);
  }
}

export async function assignMediaToItem(itemId: string, mediaId: string) {
  const ctx = await adminApi();
  if (!ctx.ok) return ctx;

  const item = ctx.catalog.sections
    .flatMap((section) => section.items)
    .find((entry) => entry.id === itemId);
  if (!item) return { ok: false as const, error: "No se encontró el producto." };
  if (item.images.length >= MAX_ITEM_IMAGES) {
    return { ok: false as const, error: "Máximo 8 fotos por producto." };
  }
  if (item.images.some((entry) => entry.mediaId === mediaId)) {
    return { ok: true as const };
  }

  const { data: asset, error: assetError } = await ctx.api
    .from("media_assets")
    .select("id, blob_url")
    .eq("id", mediaId)
    .eq("store_id", ctx.catalog.store.id)
    .single();
  if (assetError || !asset) {
    return { ok: false as const, error: "No se encontró la foto." };
  }

  const { error } = await ctx.api.from("menu_item_media").insert({
    item_id: itemId,
    media_id: asset.id,
    image_url: asset.blob_url,
    sort_order: item.images.length,
  });
  if (error) {
    if (error.message.includes("menu_item_media")) {
      const { error: fallback } = await ctx.api
        .from("menu_items")
        .update({ image_url: asset.blob_url, media_id: asset.id })
        .eq("id", itemId);
      if (fallback?.message.includes("media_id")) {
        const retry = await ctx.api
          .from("menu_items")
          .update({ image_url: asset.blob_url })
          .eq("id", itemId);
        if (retry.error) return { ok: false as const, error: retry.error.message };
      } else if (fallback) {
        return { ok: false as const, error: fallback.message };
      }
    } else {
      return { ok: false as const, error: error.message };
    }
  } else {
    await syncItemCover(ctx.api, itemId);
  }

  await touchMenu(ctx.catalog.menu.id);
  revalidateMedia(ctx.catalog.store.slug);
  return { ok: true as const };
}

export async function removeItemMedia(itemId: string, galleryId: string) {
  const ctx = await adminApi();
  if (!ctx.ok) return ctx;

  const item = ctx.catalog.sections
    .flatMap((section) => section.items)
    .find((entry) => entry.id === itemId);
  if (!item) return { ok: false as const, error: "No se encontró el producto." };

  const { error } = await ctx.api
    .from("menu_item_media")
    .delete()
    .eq("id", galleryId)
    .eq("item_id", itemId);
  if (error) return { ok: false as const, error: error.message };

  await syncItemCover(ctx.api, itemId);
  await touchMenu(ctx.catalog.menu.id);
  revalidateMedia(ctx.catalog.store.slug);
  return { ok: true as const };
}