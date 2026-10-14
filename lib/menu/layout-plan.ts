import { asSectionComponent } from "@/lib/menu/sections";

export type LayoutPlanSection = {
  id: string;
  name: string;
  componentIds: string[];
};

export const MAX_LAYOUT_SECTIONS = 6;

export function newLayoutSectionId() {
  return crypto.randomUUID();
}

export function layoutPlanFromTheme(theme: unknown): LayoutPlanSection[] | null {
  if (!theme || typeof theme !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(theme, "layoutSections")) return null;
  return parseLayoutPlan((theme as Record<string, unknown>).layoutSections);
}

export function parseLayoutPlan(value: unknown): LayoutPlanSection[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" && row.id ? row.id : `layout-${index + 1}`;
    const name =
      typeof row.name === "string" && row.name.trim() ? row.name.trim().slice(0, 40) : `Sección ${index + 1}`;
    const ids = Array.isArray(row.componentIds)
      ? row.componentIds.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
    return [{ id, name, componentIds: ids }];
  });
}

export function themeWithLayoutPlan(
  theme: Record<string, unknown> | null | undefined,
  plan: LayoutPlanSection[],
) {
  return {
    ...(theme ?? {}),
    layoutSections: plan,
  };
}

export function defaultPlanFromComponents(
  components: Array<{ id: string; component?: string | null }>,
): LayoutPlanSection[] {
  const groups: Array<{ name: string; ids: string[] }> = [
    { name: "Precios", ids: [] },
    { name: "Promo", ids: [] },
    { name: "Listas", ids: [] },
    { name: "Destacados", ids: [] },
  ];
  for (const item of components) {
    const key = asSectionComponent(item.component);
    if (key === "prices") groups[0].ids.push(item.id);
    else if (key === "promo") groups[1].ids.push(item.id);
    else if (key === "heroes") groups[3].ids.push(item.id);
    else groups[2].ids.push(item.id);
  }
  const bands = groups
    .filter((group) => group.ids.length)
    .map((group) => ({
      id: newLayoutSectionId(),
      name: group.name,
      componentIds: group.ids,
    }));
  return bands.length
    ? bands
    : [{ id: newLayoutSectionId(), name: "Sección 1", componentIds: components.map((item) => item.id) }];
}

export function ensureLayoutPlan(
  componentIds: string[],
  plan: LayoutPlanSection[] | null | undefined,
): LayoutPlanSection[] {
  const known = new Set(componentIds);
  return (plan ?? []).map((section, index) => ({
    id: section.id || `layout-${index + 1}`,
    name: section.name.trim() || `Sección ${index + 1}`,
    componentIds: section.componentIds.filter((id) => known.has(id)),
  }));
}

export function unplacedComponents<T extends { id: string }>(
  components: T[],
  plan: LayoutPlanSection[] | null | undefined,
) {
  const placed = new Set((plan ?? []).flatMap((section) => section.componentIds));
  return components.filter((item) => !placed.has(item.id));
}

export function componentsForSection<T extends { id: string }>(
  components: T[],
  section: LayoutPlanSection,
) {
  const byId = new Map(components.map((item) => [item.id, item]));
  return section.componentIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

export function flattenComponentOrder(plan: LayoutPlanSection[]) {
  return plan.flatMap((section) => section.componentIds);
}

export function moveComponentInPlan(
  plan: LayoutPlanSection[],
  componentId: string,
  targetSectionId: string,
  targetIndex?: number,
): LayoutPlanSection[] {
  const without = plan.map((section) => ({
    ...section,
    componentIds: section.componentIds.filter((id) => id !== componentId),
  }));
  return without.map((section) => {
    if (section.id !== targetSectionId) return section;
    const ids = [...section.componentIds];
    const index = Math.max(0, Math.min(targetIndex ?? ids.length, ids.length));
    ids.splice(index, 0, componentId);
    return { ...section, componentIds: ids };
  });
}

export function reorderPlanSections(
  plan: LayoutPlanSection[],
  fromId: string,
  toId: string,
): LayoutPlanSection[] {
  const from = plan.findIndex((section) => section.id === fromId);
  const to = plan.findIndex((section) => section.id === toId);
  if (from < 0 || to < 0 || from === to) return plan;
  const next = [...plan];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function missingLayoutSchema(error?: { message?: string; code?: string } | null) {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();
  return (
    code === "42703" ||
    code === "42P01" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    message.includes("layout_section") ||
    message.includes("menu_layout_sections") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}
