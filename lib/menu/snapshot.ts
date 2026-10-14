import { asStageOrientation } from "@/lib/display/stage";
import { ensureLayoutPlan } from "@/lib/menu/layout-plan";
import { SNAPSHOT_SEEDS } from "@/lib/menu/seeds/la-michoacana";
import type { MenuSnapshot } from "@/lib/menu/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@supabase/supabase-js";

function normalizeSnapshot(payload: unknown): MenuSnapshot | null {
  if (!payload || typeof payload !== "object") return null;
  const snapshot = payload as MenuSnapshot;
  if (!snapshot.store || !snapshot.layoutKey) return null;
  const ids = (snapshot.sections ?? []).map((section) => section.id);
  return {
    ...snapshot,
    orientation: asStageOrientation(snapshot.orientation),
    layoutSections: ensureLayoutPlan(ids, snapshot.layoutSections ?? []),
  };
}

function getSupabase() {
  if (!hasSupabaseEnv()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function getPublishedMenu(
  slug: string,
): Promise<MenuSnapshot | null> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .schema("api")
      .from("menu_snapshots")
      .select("payload")
      .eq("store_slug", slug)
      .maybeSingle();

    if (!error && data?.payload) {
      return normalizeSnapshot(data.payload) ?? (data.payload as MenuSnapshot);
    }
  }

  return SNAPSHOT_SEEDS[slug] ?? null;
}
