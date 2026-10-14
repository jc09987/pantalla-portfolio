import type { ApiClient } from "@/lib/supabase/server";

export async function resolveStoreMenuId(
  api: ApiClient,
  storeId: string,
): Promise<string | null> {
  const { data: menus } = await api
    .from("menus")
    .select("id, is_published, updated_at")
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false });
  if (!menus?.length) return null;

  const { data: sections } = await api
    .from("menu_sections")
    .select("menu_id")
    .in("menu_id", menus.map((menu) => menu.id));
  const filled = new Set((sections ?? []).map((section) => section.menu_id as string));

  const latestFilled = menus.find((menu) => filled.has(menu.id));
  if (latestFilled) return latestFilled.id as string;

  const publishedFilled = menus.find((menu) => menu.is_published && filled.has(menu.id));
  if (publishedFilled) return publishedFilled.id as string;

  return menus[0].id as string;
}

export async function markOnlyMenuPublished(
  api: ApiClient,
  storeId: string,
  menuId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: clearError } = await api
    .from("menus")
    .update({ is_published: false })
    .eq("store_id", storeId)
    .neq("id", menuId)
    .eq("is_published", true);
  if (clearError) return { ok: false, error: clearError.message };

  const { data, error } = await api
    .from("menus")
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq("id", menuId)
    .eq("store_id", storeId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No se pudo publicar el menú." };
  return { ok: true };
}
