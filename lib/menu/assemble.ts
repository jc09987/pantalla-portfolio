import { orientationFromRecord } from "@/lib/display/stage";
import type {
  AnimationPreset,
  FeatureIcon,
  HeroVariant,
  MenuSnapshot,
  MenuTheme,
  SectionKind,
} from "@/lib/menu/types";
import { isLayoutKey } from "@/lib/menu/types";
import { displayMediaUrl } from "@/lib/blob/display";
import { urlsForItem } from "@/lib/menu/item-media";
import { asSectionComponent } from "@/lib/menu/sections";
import { ensureLayoutPlan, layoutPlanFromTheme } from "@/lib/menu/layout-plan";
import { resolveHeaderIcon } from "@/lib/menu/list-icons";

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  locale: string;
  logo_url?: string | null;
};

type MenuRow = {
  id: string;
  store_id: string;
  name: string;
  layout_key: string;
  orientation?: string | null;
  theme: MenuTheme | null;
  title: string | null;
  tagline: string | null;
  ribbon: string | null;
  closing: string | null;
  is_published: boolean;
  updated_at: string;
};

type TierRow = {
  id: string;
  label: string;
  price: number | string;
  scoop_count: number;
  scoop_colors: unknown;
  sort_order: number;
};

type HeroRow = {
  id: string;
  caption: string | null;
  badge: string | null;
  image_url: string | null;
  variant: string | null;
  animation_preset: string;
  sort_order: number;
};

type SectionRow = {
  id: string;
  name: string;
  kind: string;
  component?: string | null;
  columns: number;
  sort_order: number;
  layout_section_id?: string | null;
  header_icon?: string | null;
  headerIcon?: string | null;
};

type ItemMediaRow = {
  id: string;
  item_id: string;
  image_url: string;
  sort_order: number;
};

type ItemRow = {
  id: string;
  section_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price?: number | string | null;
  compare_at_price?: number | string | null;
  is_available: boolean;
  animation_preset: string | null;
  sort_order: number;
};

type FeatureRow = {
  id: string;
  icon: string;
  label: string;
  sort_order: number;
};

function asPreset(value: string | null | undefined): AnimationPreset {
  if (
    value === "float" ||
    value === "fade-up" ||
    value === "pulse-soft" ||
    value === "splash" ||
    value === "ken-burns" ||
    value === "cascade"
  ) {
    return value;
  }
  return "none";
}

function asColors(value: unknown): string[] {
  if (!Array.isArray(value)) return ["#ffd54a"];
  return value.filter((entry): entry is string => typeof entry === "string");
}

export function assembleSnapshot(input: {
  store: StoreRow;
  menu: MenuRow;
  tiers: TierRow[];
  heroes: HeroRow[];
  sections: SectionRow[];
  items: ItemRow[];
  itemMedia?: ItemMediaRow[];
  features: FeatureRow[];
  layoutSections?: MenuSnapshot["layoutSections"];
  revision: number;
}): MenuSnapshot {
  const theme = input.menu.theme ?? {
    primary: "#e91e8c",
    secondary: "#00b0e0",
    footer: "#2a1548",
    gold: "#f0c93a",
    surface: "#ffffff",
    ink: "#2a1548",
  };
  const gallery = input.itemMedia ?? [];
  const orderedSections = [...input.sections].sort((a, b) => a.sort_order - b.sort_order);
  const existingPlan = input.layoutSections ?? layoutPlanFromTheme(theme);
  const layoutSections =
    existingPlan != null
      ? ensureLayoutPlan(
          orderedSections.map((section) => section.id),
          existingPlan,
        )
      : [];

  return {
    revision: input.revision,
    store: {
      slug: input.store.slug,
      name: input.store.name,
      locale: input.store.locale,
    },
    layoutKey: isLayoutKey(input.menu.layout_key) ? input.menu.layout_key : "classic-split",
    orientation: orientationFromRecord(input.menu),
    theme,
    brand: {
      title: input.menu.title ?? input.store.name,
      subtitle: input.menu.tagline ?? "",
      ribbon: input.menu.ribbon ?? "",
      logoUrl: displayMediaUrl(input.store.logo_url) || null,
    },
    priceTiers: [...input.tiers]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((tier) => ({
        id: tier.id,
        label: tier.label,
        price: Number(tier.price),
        scoops: tier.scoop_count,
        scoopColors: asColors(tier.scoop_colors),
        animation: "float",
      })),
    heroes: [...input.heroes]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((hero) => ({
        id: hero.id,
        caption: hero.caption ?? undefined,
        badge: hero.badge ?? undefined,
        variant: (hero.variant as HeroVariant) || "mango",
        imageUrl: displayMediaUrl(hero.image_url) || null,
        animation: asPreset(hero.animation_preset),
      })),
    layoutSections,
    sections: orderedSections.map((section) => ({
        id: section.id,
        name: section.name,
        kind: (section.kind as SectionKind) || "agua",
        component: asSectionComponent(section.component),
        columns: section.columns,
        headerIcon: resolveHeaderIcon(section, theme),
        layoutSectionId: section.layout_section_id ?? undefined,
        items: input.items
          .filter((item) => item.section_id === section.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => {
            const imageUrls = urlsForItem(item, gallery);
            return {
              id: item.id,
              name: item.name,
              available: item.is_available,
              animation: asPreset(item.animation_preset),
              imageUrl: imageUrls[0] ?? null,
              imageUrls,
              description: item.description ?? null,
              price: item.price == null || item.price === "" ? null : Number(item.price),
              compareAtPrice:
                item.compare_at_price == null || item.compare_at_price === ""
                  ? null
                  : Number(item.compare_at_price),
            };
          }),
      })),
    features: [...input.features]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((feature) => ({
        id: feature.id,
        icon: feature.icon as FeatureIcon,
        label: feature.label,
      })),
    closing: input.menu.closing ?? "",
  };
}
