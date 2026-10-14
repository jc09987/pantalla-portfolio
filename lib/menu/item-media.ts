import { displayMediaUrl } from "@/lib/blob/display";

export type ItemMediaRef = {
  id?: string;
  item_id: string;
  image_url: string;
  sort_order?: number;
};

export function urlsForItem(
  item: { id: string; image_url?: string | null },
  gallery: ItemMediaRef[],
) {
  const fromGallery = gallery
    .filter((entry) => entry.item_id === item.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((entry) => displayMediaUrl(entry.image_url))
    .filter(Boolean);
  if (fromGallery.length) return fromGallery;
  const cover = displayMediaUrl(item.image_url);
  return cover ? [cover] : [];
}

export function itemImageList(item: {
  imageUrl?: string | null;
  imageUrls?: string[] | null;
}) {
  const listed = (item.imageUrls ?? []).map((url) => displayMediaUrl(url)).filter(Boolean);
  if (listed.length) return listed;
  const cover = displayMediaUrl(item.imageUrl);
  return cover ? [cover] : [];
}
