import type { AdminCatalog, AdminSection } from "@/lib/menu/catalog";
import type { LayoutPlanSection } from "@/lib/menu/layout-plan";

const DIRTY_STORAGE = "pantalla-dirty-fields";

const prices = new Map<string, string>();
const itemPrices = new Map<string, string>();
const names = new Map<string, string>();
const descriptions = new Map<string, string>();
const available = new Map<string, boolean>();
const extraItems = new Map<string, Array<{
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_available: boolean;
  sort_order: number;
  images?: Array<{ id: string; url: string; mediaId: string | null }>;
}>>();
const removedItems = new Set<string>();
const extraSections = new Map<string, AdminSection>();
const removedSections = new Set<string>();
const sectionNames = new Map<string, string>();
const sectionComponents = new Map<string, string>();
const sectionColumns = new Map<string, number>();
const sectionIcons = new Map<string, string>();
let sectionOrder: string[] | null = null;
let layoutPlan: LayoutPlanSection[] | null = null;
const dirty = new Set<string>();
let unpublishedEdits = false;
let forceClean = false;
let dirtyHydrated = false;

function persistDirty() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DIRTY_STORAGE, JSON.stringify([...dirty]));
  } catch {
    /* ignore quota / private mode */
  }
}

export function hydrateDirty() {
  if (dirtyHydrated || typeof window === "undefined") return;
  dirtyHydrated = true;
  try {
    const raw = sessionStorage.getItem(DIRTY_STORAGE);
    if (!raw) return;
    const keys = JSON.parse(raw) as unknown;
    if (!Array.isArray(keys)) return;
    for (const key of keys) {
      if (typeof key === "string") dirty.add(key);
    }
  } catch {
    /* ignore bad storage */
  }
}

export function markDirty(key: string) {
  forceClean = false;
  unpublishedEdits = true;
  dirty.add(key);
  persistDirty();
}

export function isDirty(key: string) {
  return dirty.has(key);
}

export function fieldClass(key: string, className: string) {
  return isDirty(key) ? `${className} field-unpublished` : className;
}

export function parseMoney(raw: string) {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 9999) return null;
  return Math.round(value * 100) / 100;
}

export function parseOptionalMoney(raw: string) {
  if (!raw.trim()) return { ok: true as const, value: null };
  const value = parseMoney(raw);
  if (value == null) return { ok: false as const };
  return { ok: true as const, value };
}

export function formatMoney(value: number) {
  return value.toFixed(2);
}

export function rememberPrice(id: string, value: number) {
  prices.set(id, formatMoney(value));
  markDirty(`tier-price:${id}`);
}

export function rememberItemPrice(id: string, value: number | null) {
  itemPrices.set(id, value == null ? "" : formatMoney(value));
  markDirty(`item-price:${id}`);
}

export function rememberName(id: string, value: string) {
  names.set(id, value);
  markDirty(`item-name:${id}`);
}

export function rememberDescription(id: string, value: string) {
  descriptions.set(id, value);
  markDirty(`item-description:${id}`);
}

export function rememberAvailable(id: string, value: boolean) {
  available.set(id, value);
  markDirty(`item-available:${id}`);
}

export function rememberAddedItem(
  sectionId: string,
  item: {
    id: string;
    name: string;
    is_available: boolean;
    sort_order: number;
    description?: string | null;
    price?: number | null;
    images?: Array<{ id: string; url: string; mediaId: string | null }>;
  },
) {
  const list = extraItems.get(sectionId) ?? [];
  extraItems.set(sectionId, [
    ...list,
    {
      ...item,
      description: item.description ?? null,
      price: item.price ?? null,
      images: item.images ?? [],
    },
  ]);
  markDirty(`item-name:${item.id}`);
}

export function rememberRemovedItem(itemId: string) {
  removedItems.add(itemId);
  markDirty(`item-removed:${itemId}`);
}

export function rememberAddedSection(section: AdminSection) {
  extraSections.set(section.id, section);
  removedSections.delete(section.id);
  markDirty(`section-new:${section.id}`);
}

export function rememberRemovedSection(sectionId: string) {
  removedSections.add(sectionId);
  extraSections.delete(sectionId);
  markDirty(`section-removed:${sectionId}`);
}

export function rememberSectionName(id: string, value: string) {
  sectionNames.set(id, value);
  markDirty(`section-name:${id}`);
}

export function rememberSectionComponent(id: string, value: string) {
  sectionComponents.set(id, value);
  markDirty(`section-component:${id}`);
}

export function rememberSectionColumns(id: string, value: number) {
  sectionColumns.set(id, value);
  markDirty(`section-columns:${id}`);
}

export function rememberSectionIcon(id: string, value: string) {
  sectionIcons.set(id, value);
  markDirty(`section-icon:${id}`);
}

export function rememberSectionOrder(ids: string[]) {
  sectionOrder = ids;
  markDirty("section-order");
}

export function rememberLayoutPlan(plan: LayoutPlanSection[]) {
  layoutPlan = plan;
  markDirty("layout-plan");
}

export function markPublished() {
  unpublishedEdits = false;
  forceClean = true;
  dirty.clear();
  prices.clear();
  itemPrices.clear();
  names.clear();
  descriptions.clear();
  available.clear();
  extraItems.clear();
  removedItems.clear();
  extraSections.clear();
  removedSections.clear();
  sectionNames.clear();
  sectionComponents.clear();
  sectionColumns.clear();
  sectionIcons.clear();
  sectionOrder = null;
  layoutPlan = null;
  persistDirty();
}

export function hasUnpublishedEdits(catalog: AdminCatalog) {
  if (forceClean && dirty.size === 0) return false;
  if (unpublishedEdits || dirty.size > 0) return true;
  if (!catalog.snapshotUpdatedAt) return true;
  return catalog.menu.updated_at > catalog.snapshotUpdatedAt;
}

export function overlayCatalog(catalog: AdminCatalog): AdminCatalog {
  const merged = [
    ...catalog.sections.filter((section) => !removedSections.has(section.id)),
    ...[...extraSections.values()].filter(
      (section) =>
        !removedSections.has(section.id) &&
        !catalog.sections.some((existing) => existing.id === section.id),
    ),
  ];
  const parentByComponent = new Map(
    (layoutPlan ?? catalog.layoutSections ?? []).flatMap((band) =>
      band.componentIds.map((id) => [id, band.id] as const),
    ),
  );
  const patched = merged.map((section) => {
    const extras = extraItems.get(section.id) ?? [];
    const items = [
      ...section.items.filter((item) => !removedItems.has(item.id)),
      ...extras.filter((item) => !section.items.some((existing) => existing.id === item.id)),
    ].map((item) => ({
      ...item,
      images: item.images ?? [],
      description: descriptions.has(item.id)
        ? descriptions.get(item.id) ?? null
        : (item.description ?? null),
      price: itemPrices.has(item.id)
        ? itemPrices.get(item.id)
          ? Number(itemPrices.get(item.id))
          : null
        : (item.price ?? null),
      name: names.get(item.id) ?? item.name,
      is_available: available.get(item.id) ?? item.is_available,
    }));
    return {
      ...section,
      name: sectionNames.get(section.id) ?? section.name,
      component: sectionComponents.get(section.id) ?? section.component,
      columns: sectionColumns.get(section.id) ?? section.columns,
      headerIcon: sectionIcons.get(section.id) ?? section.headerIcon,
      layoutSectionId: parentByComponent.get(section.id) ?? section.layoutSectionId,
      items,
    };
  });
  const sections = sectionOrder
    ? [...patched].sort((a, b) => {
        const ai = sectionOrder!.indexOf(a.id);
        const bi = sectionOrder!.indexOf(b.id);
        return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      })
    : patched;

  return {
    ...catalog,
    tiers: catalog.tiers.map((tier) => ({
      ...tier,
      price: prices.has(tier.id) ? Number(prices.get(tier.id)) : tier.price,
    })),
    sections,
    layoutSections: layoutPlan ?? catalog.layoutSections,
  };
}

export function overlayPriceText(id: string, fallback: number) {
  return prices.get(id) ?? formatMoney(fallback);
}

export function overlayItemPriceText(id: string, fallback: number | null) {
  if (itemPrices.has(id)) return itemPrices.get(id) ?? "";
  return fallback == null ? "" : formatMoney(fallback);
}

export function overlayName(id: string, fallback: string) {
  return names.get(id) ?? fallback;
}

export function overlayDescription(id: string, fallback: string | null) {
  return descriptions.get(id) ?? fallback ?? "";
}

export function overlayAvailable(id: string, fallback: boolean) {
  return available.get(id) ?? fallback;
}
