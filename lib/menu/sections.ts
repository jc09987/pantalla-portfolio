export const SECTION_COMPONENTS = [
  {
    key: "products",
    name: "Lista",
    hint: "Filas de productos con foto, nombre, precio y descripción.",
  },
  {
    key: "carousel",
    name: "Carrusel",
    hint: "Fotos grandes que rotan cada 30 segundos.",
  },
  {
    key: "promo",
    name: "Promo",
    hint: "Franjas grandes como el diseño Promo.",
  },
  {
    key: "prices",
    name: "Precios",
    hint: "Tamaños y precios del menú.",
  },
  {
    key: "heroes",
    name: "Destacados",
    hint: "Fotos destacadas de la pantalla.",
  },
] as const;

export type SectionComponent = (typeof SECTION_COMPONENTS)[number]["key"];

export function isSectionComponent(value: string): value is SectionComponent {
  return SECTION_COMPONENTS.some((entry) => entry.key === value);
}

export function asSectionComponent(value: string | null | undefined): SectionComponent {
  return value && isSectionComponent(value) ? value : "products";
}

export function isProductComponent(value: string | null | undefined) {
  const component = asSectionComponent(value);
  return component === "products" || component === "carousel" || component === "promo";
}

export function defaultSectionName(component: SectionComponent) {
  return SECTION_COMPONENTS.find((entry) => entry.key === component)?.name ?? "Sección";
}

export function labelForComponent(component: string) {
  return SECTION_COMPONENTS.find((entry) => entry.key === component)?.name ?? "Lista";
}
