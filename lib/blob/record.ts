import type { ApiClient } from "@/lib/supabase/server";

export type MediaAssetRow = {
  id: string;
  store_id: string;
  blob_url: string;
  blob_pathname: string;
  mime: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  created_at: string;
};

export async function upsertMediaAsset(
  api: ApiClient,
  input: {
    storeId: string;
    blobUrl: string;
    blobPathname: string;
    mime?: string | null;
    width?: number | null;
    height?: number | null;
    alt?: string | null;
  },
) {
  const row = {
    store_id: input.storeId,
    blob_url: input.blobUrl,
    blob_pathname: input.blobPathname,
    mime: input.mime ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    alt: input.alt ?? null,
  };

  const upserted = await api
    .from("media_assets")
    .upsert(row, { onConflict: "blob_pathname" })
    .select("id, store_id, blob_url, blob_pathname, mime, width, height, alt, created_at")
    .single();

  if (!upserted.error) return upserted;
  if (!/no unique|ON CONFLICT/i.test(upserted.error.message)) return upserted;

  return api
    .from("media_assets")
    .insert(row)
    .select("id, store_id, blob_url, blob_pathname, mime, width, height, alt, created_at")
    .single();
}
