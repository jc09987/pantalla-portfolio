import type { MenuSnapshot } from "@/lib/menu/types";

const agua = [
  "Tamarindo",
  "Limón",
  "Mango",
  "Piña",
  "Fresa",
  "Sandía",
  "Coco",
  "Nance",
  "Guanábana",
  "Maracuyá",
  "Jamaica",
  "Pepino",
  "Mamey",
  "Guayaba",
] as const;

const leche = [
  "Vainilla",
  "Chocolate",
  "Pistache",
  "Cajeta",
  "Coco",
  "Nuez",
  "Fresa",
  "Mango",
  "Queso",
  "Pay de Limón",
  "Mazapán",
  "Gansito",
  "Elote",
  "Café",
  "Almendrado",
  "Chicle",
  "Rompope",
  "Cookies",
  "Chocomenta",
  "Tres Leches",
  "Arroz con Leche",
  "Cacahuate",
  "Pay de Queso",
  "Rocio",
] as const;

export const LA_MICHOACANA_SNAPSHOT: MenuSnapshot = {
  revision: 1,
  store: {
    slug: "la-michoacana",
    name: "La Michoacana",
    locale: "es-MX",
  },
  layoutKey: "classic-split",
  orientation: "landscape",
  theme: {
    primary: "#e91e8c",
    secondary: "#00b0e0",
    footer: "#2a1548",
    gold: "#f0c93a",
  },
  brand: {
    title: "LA MICHOACANA",
    subtitle: "Nieves Artesanales",
    ribbon: "HECHAS CON FRUTA NATURAL",
  },
  priceTiers: [
    {
      id: "tier-1",
      label: "1 SCOOP",
      price: 2.33,
      scoops: 1,
      scoopColors: ["#ffd54a"],
      animation: "float",
    },
    {
      id: "tier-2",
      label: "2 SCOOPS",
      price: 3.49,
      scoops: 2,
      scoopColors: ["#ff6ba8", "#ffd54a"],
      animation: "float",
    },
    {
      id: "tier-3",
      label: "3 SCOOPS",
      price: 5.38,
      scoops: 3,
      scoopColors: ["#7ed957", "#ff6ba8", "#ffd54a"],
      animation: "float",
    },
  ],
  heroes: [
    {
      id: "hero-mango",
      caption: "Sabor y Tradición",
      variant: "mango",
      animation: "float",
    },
    {
      id: "hero-fresa",
      badge: "¡Más de 25 Sabores!",
      variant: "fresa",
      animation: "float",
    },
  ],
  layoutSections: [
    {
      id: "band-lists",
      name: "Listas",
      componentIds: ["agua", "leche"],
    },
  ],
  sections: [
    {
      id: "agua",
      name: "NIEVES DE AGUA",
      kind: "agua",
      component: "products",
      columns: 2,
      headerIcon: "water",
      items: agua.map((name, index) => ({
        id: `agua-${index + 1}`,
        name,
        available: true,
        animation: "cascade",
      })),
    },
    {
      id: "leche",
      name: "NIEVES DE LECHE",
      kind: "leche",
      component: "products",
      columns: 3,
      headerIcon: "milk",
      items: leche.map((name, index) => ({
        id: `leche-${index + 1}`,
        name,
        available: true,
        animation: "cascade",
      })),
    },
  ],
  features: [
    { id: "feat-1", icon: "leaf", label: "INGREDIENTES NATURALES" },
    { id: "feat-2", icon: "fruit", label: "FRUTA DE TEMPORADA" },
    { id: "feat-3", icon: "heart", label: "HECHAS CON AMOR" },
    { id: "feat-4", icon: "snowflake", label: "SIEMPRE FRESCAS" },
  ],
  closing: "¡Gracias por preferirnos!",
};

export const SNAPSHOT_SEEDS: Record<string, MenuSnapshot> = {
  [LA_MICHOACANA_SNAPSHOT.store.slug]: LA_MICHOACANA_SNAPSHOT,
};
