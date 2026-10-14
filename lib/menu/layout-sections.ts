import {
  ensureLayoutPlan,
  flattenComponentOrder,
  layoutPlanFromTheme,
  missingLayoutSchema,
  themeWithLayoutPlan,
  type LayoutPlanSection,
} from "@/lib/menu/layout-plan";
import {
  missingIconColumn,
  themeWithSectionIcon,
  type ListIcon,
} from "@/lib/menu/list-icons";
import type { ApiClient } from "@/lib/supabase/server";

type ThemeMap = Record<string, unknown>;

function asTheme(value: unknown): ThemeMap {
  return value && typeof value === "object" ? { ...(value as ThemeMap) } : {};
}

export async function saveLayoutPlan(
  api: ApiClient,
  menuId: string,
  currentTheme: unknown,
  plan: LayoutPlanSection[],
) {
  const theme = themeWithLayoutPlan(asTheme(currentTheme), plan);
  const now = new Date().toISOString();
  await api.from("menus").update({ theme, updated_at: now }).eq("id", menuId);

  const { error: upsertError } = plan.length
    ? await api.from("menu_layout_sections").upsert(
        plan.map((section, index) => ({
          id: section.id,
          menu_id: menuId,
          name: section.name,
          sort_order: index,
        })),
        { onConflict: "id" },
      )
    : { error: null };
  if (upsertError && missingLayoutSchema(upsertError)) return { ok: true as const, plan };
  if (upsertError) return { ok: false as const, error: upsertError.message };

  const { data: existing, error: existingError } = await api
    .from("menu_layout_sections")
    .select("id")
    .eq("menu_id", menuId);
  if (existingError && missingLayoutSchema(existingError)) return { ok: true as const, plan };
  if (existingError) return { ok: false as const, error: existingError.message };
  const keep = new Set(plan.map((section) => section.id));
  const extras = (existing ?? []).map((row) => row.id as string).filter((id) => !keep.has(id));
  if (extras.length) {
    await api.from("menu_layout_sections").delete().in("id", extras);
  }

  const order = flattenComponentOrder(plan);
  const placed = new Set(order);
  for (const [index, componentId] of order.entries()) {
    const parent = plan.find((section) => section.componentIds.includes(componentId));
    if (!parent) continue;
    const { error } = await api
      .from("menu_sections")
      .update({ layout_section_id: parent.id, sort_order: index })
      .eq("id", componentId)
      .eq("menu_id", menuId);
    if (error && missingLayoutSchema(error)) break;
    if (error) return { ok: false as const, error: error.message };
  }

  const { data: allBlocks, error: listError } = await api
    .from("menu_sections")
    .select("id")
    .eq("menu_id", menuId);
  if (listError && missingLayoutSchema(listError)) return { ok: true as const, plan };
  if (listError) return { ok: false as const, error: listError.message };
  const unplaced = (allBlocks ?? [])
    .map((row) => row.id as string)
    .filter((id) => !placed.has(id));
  if (unplaced.length) {
    const { error } = await api
      .from("menu_sections")
      .update({ layout_section_id: null })
      .eq("menu_id", menuId)
      .in("id", unplaced);
    if (error && !missingLayoutSchema(error)) return { ok: false as const, error: error.message };
  }

  return { ok: true as const, plan };
}

export async function loadLayoutPlan(
  api: ApiClient,
  menuId: string,
  theme: unknown,
  components: Array<{ id: string; component?: string | null }>,
): Promise<LayoutPlanSection[]> {
  const componentIds = components.map((item) => item.id);
  const fromTheme = layoutPlanFromTheme(theme);
  if (fromTheme != null) return ensureLayoutPlan(componentIds, fromTheme);

  const { data, error } = await api
    .from("menu_layout_sections")
    .select("id, name, sort_order")
    .eq("menu_id", menuId)
    .order("sort_order");

  if (error || !data?.length) return [];

  const { data: blocks, error: blockError } = await api
    .from("menu_sections")
    .select("id, layout_section_id, sort_order")
    .eq("menu_id", menuId)
    .order("sort_order");

  if (blockError && missingLayoutSchema(blockError)) {
    return fromTheme != null ? ensureLayoutPlan(componentIds, fromTheme) : [];
  }

  const grouped = new Map<string, string[]>();
  const knownParents = new Set(data.map((row) => row.id as string));
  for (const block of blocks ?? []) {
    const parent = block.layout_section_id as string | null;
    if (!parent || !knownParents.has(parent)) continue;
    const list = grouped.get(parent) ?? [];
    list.push(block.id as string);
    grouped.set(parent, list);
  }

  const fromTable: LayoutPlanSection[] = data.map((row) => ({
    id: row.id as string,
    name: (row.name as string) || "Sección",
    componentIds: grouped.get(row.id as string) ?? [],
  }));

  return ensureLayoutPlan(componentIds, fromTable);
}

export async function readMenuTheme(api: ApiClient, menuId: string) {
  const { data } = await api.from("menus").select("theme").eq("id", menuId).maybeSingle();
  return data?.theme ?? {};
}

export async function persistSectionIcon(
  api: ApiClient,
  menuId: string,
  sectionId: string,
  icon: ListIcon,
) {
  const current = await readMenuTheme(api, menuId);
  const theme = themeWithSectionIcon(asTheme(current), sectionId, icon);
  const now = new Date().toISOString();
  await api.from("menus").update({ theme, updated_at: now }).eq("id", menuId);

  const { error } = await api
    .from("menu_sections")
    .update({ header_icon: icon })
    .eq("id", sectionId)
    .eq("menu_id", menuId);
  if (error && !missingIconColumn(error)) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}
