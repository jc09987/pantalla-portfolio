import type { StageOrientation } from "@/lib/display/stage";
import type { LayoutPlanSection } from "@/lib/menu/layout-plan";
import type { ListIcon } from "@/lib/menu/list-icons";
import type { SectionComponent } from "@/lib/menu/sections";

export const ANIMATION_PRESETS = [
  "none",
  "float",
  "fade-up",
  "pulse-soft",
  "splash",
  "ken-burns",
  "cascade",
] as const;

export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];

export type LayoutKey =
  | "classic-split"
  | "photo-grid"
  | "promo-hero"
  | "row-promo"
  | "card-list"
  | "night-board";

export function isLayoutKey(value: string): value is LayoutKey {
  return LAYOUTS.some((layout) => layout.key === value);
}

export const LAYOUTS: Array<{
  key: LayoutKey;
  name: string;
  hint: string;
}> = [
  {
    key: "classic-split",
    name: "Clásico",
    hint: "Listas largas, héroes y foto en cada sabor.",
  },
  {
    key: "photo-grid",
    name: "Mosaico",
    hint: "Tarjetas grandes; las fotos rotan en carrusel.",
  },
  {
    key: "promo-hero",
    name: "Promo",
    hint: "Un producto enorme y el resto en un ticker.",
  },
  {
    key: "row-promo",
    name: "Filas promo",
    hint: "Cada producto es una franja grande como el Promo.",
  },
  {
    key: "card-list",
    name: "Tarjetas",
    hint: "Filas con carrusel a la izquierda y precio.",
  },
  {
    key: "night-board",
    name: "Noche",
    hint: "Pizarra oscura, fotos y texto en ciclo.",
  },
];

export type FeatureIcon = "leaf" | "fruit" | "heart" | "snowflake";

export type HeroVariant = "mango" | "fresa";

export type SectionKind = "agua" | "leche";

export type MenuTheme = {
  primary: string;
  secondary: string;
  footer: string;
  gold: string;
  surface?: string;
  ink?: string;
};

export type MenuSnapshot = {
  revision: number;
  store: {
    slug: string;
    name: string;
    locale: string;
  };
  layoutKey: LayoutKey;
  orientation: StageOrientation;
  theme: MenuTheme;
  brand: {
    title: string;
    subtitle: string;
    ribbon: string;
    logoUrl?: string | null;
  };
  priceTiers: Array<{
    id: string;
    label: string;
    price: number;
    scoops: number;
    scoopColors: string[];
    animation: AnimationPreset;
  }>;
  heroes: Array<{
    id: string;
    caption?: string;
    badge?: string;
    variant: HeroVariant;
    imageUrl?: string | null;
    animation: AnimationPreset;
  }>;
  layoutSections: LayoutPlanSection[];
  sections: Array<{
    id: string;
    name: string;
    kind: SectionKind;
    component: SectionComponent;
    columns: number;
    headerIcon?: ListIcon;
    layoutSectionId?: string;
    items: Array<{
      id: string;
      name: string;
      available: boolean;
      animation?: AnimationPreset;
      imageUrl?: string | null;
      imageUrls?: string[];
      description?: string | null;
      price?: number | null;
      compareAtPrice?: number | null;
    }>;
  }>;
  features: Array<{
    id: string;
    icon: FeatureIcon;
    label: string;
  }>;
  closing: string;
};
