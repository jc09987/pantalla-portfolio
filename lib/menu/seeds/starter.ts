import type { MenuSnapshot } from "@/lib/menu/types";

export function makeStarterSnapshot(storeName: string): MenuSnapshot {
  const title = storeName.trim() || "Mi negocio";
  return {
    revision: 1,
    store: {
      slug: "nuevo",
      name: title,
      locale: "es-MX",
    },
    layoutKey: "classic-split",
    orientation: "landscape",
    theme: {
      primary: "#e11d48",
      secondary: "#2563eb",
      footer: "#18181b",
      gold: "#f59e0b",
    },
    brand: {
      title,
      subtitle: "Nuestro menú",
      ribbon: "BIENVENIDOS",
    },
    priceTiers: [
      {
        id: "tier-1",
        label: "CHICO",
        price: 0,
        scoops: 1,
        scoopColors: [],
        animation: "none",
      },
      {
        id: "tier-2",
        label: "GRANDE",
        price: 0,
        scoops: 1,
        scoopColors: [],
        animation: "none",
      },
    ],
    heroes: [
      {
        id: "hero-1",
        caption: title,
        variant: "mango",
        animation: "none",
      },
      {
        id: "hero-2",
        badge: "Nuevo",
        variant: "fresa",
        animation: "none",
      },
    ],
    layoutSections: [
      {
        id: "band-main",
        name: "Sección 1",
        componentIds: ["sec-1", "sec-2"],
      },
    ],
    sections: [
      {
        id: "sec-1",
        name: "DESTACADOS",
        kind: "leche",
        component: "products",
        columns: 2,
        headerIcon: "utensils",
        items: [
          { id: "item-1", name: "Producto 1", available: true, animation: "cascade" },
          { id: "item-2", name: "Producto 2", available: true, animation: "cascade" },
          { id: "item-3", name: "Producto 3", available: true, animation: "cascade" },
        ],
      },
      {
        id: "sec-2",
        name: "MÁS OPCIONES",
        kind: "agua",
        component: "products",
        columns: 2,
        headerIcon: "salad",
        items: [
          { id: "item-4", name: "Producto 4", available: true, animation: "cascade" },
          { id: "item-5", name: "Producto 5", available: true, animation: "cascade" },
        ],
      },
    ],
    features: [
      { id: "feat-1", icon: "heart", label: "HECHO CON CUIDADO" },
      { id: "feat-2", icon: "leaf", label: "INGREDIENTES DE CALIDAD" },
      { id: "feat-3", icon: "snowflake", label: "SIEMPRE FRESCO" },
    ],
    closing: "¡Gracias por visitarnos!",
  };
}
