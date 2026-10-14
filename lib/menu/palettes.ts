import type { MenuTheme } from "@/lib/menu/types";

export type ColorPalette = {
  key: string;
  name: string;
  hint: string;
  theme: Required<MenuTheme>;
};

export const COLOR_PALETTES: ColorPalette[] = [
  {
    key: "michoacana",
    name: "Michoacana",
    hint: "Rosa y cielo",
    theme: {
      primary: "#e91e8c",
      secondary: "#00b0e0",
      footer: "#2a1548",
      gold: "#f0c93a",
      surface: "#fff7fb",
      ink: "#2a1548",
    },
  },
  {
    key: "cacao",
    name: "Cacao",
    hint: "Chocolate y crema",
    theme: {
      primary: "#7c2d12",
      secondary: "#c2410c",
      footer: "#1c1917",
      gold: "#eab308",
      surface: "#fff7ed",
      ink: "#431407",
    },
  },
  {
    key: "lima",
    name: "Lima",
    hint: "Hierba y cítrico",
    theme: {
      primary: "#15803d",
      secondary: "#65a30d",
      footer: "#14532d",
      gold: "#facc15",
      surface: "#f7fee7",
      ink: "#14532d",
    },
  },
  {
    key: "mar",
    name: "Mar",
    hint: "Turquesa y arena",
    theme: {
      primary: "#0e7490",
      secondary: "#0284c7",
      footer: "#082f49",
      gold: "#fbbf24",
      surface: "#ecfeff",
      ink: "#164e63",
    },
  },
  {
    key: "fuego",
    name: "Fuego",
    hint: "Chile y naranja",
    theme: {
      primary: "#dc2626",
      secondary: "#ea580c",
      footer: "#450a0a",
      gold: "#f59e0b",
      surface: "#fff7ed",
      ink: "#7f1d1d",
    },
  },
  {
    key: "uva",
    name: "Uva",
    hint: "Violeta y oro",
    theme: {
      primary: "#7c3aed",
      secondary: "#c026d3",
      footer: "#2e1065",
      gold: "#f5d0fe",
      surface: "#faf5ff",
      ink: "#3b0764",
    },
  },
  {
    key: "noche",
    name: "Noche",
    hint: "Pizarra oscura",
    theme: {
      primary: "#f43f5e",
      secondary: "#22d3ee",
      footer: "#020617",
      gold: "#fbbf24",
      surface: "#0f172a",
      ink: "#e2e8f0",
    },
  },
  {
    key: "vainilla",
    name: "Vainilla",
    hint: "Crema y caramelo",
    theme: {
      primary: "#b45309",
      secondary: "#a16207",
      footer: "#44403c",
      gold: "#f59e0b",
      surface: "#fffbeb",
      ink: "#44403c",
    },
  },
];

export function paletteForTheme(theme: MenuTheme) {
  return COLOR_PALETTES.find(
    (palette) =>
      palette.theme.primary.toLowerCase() === theme.primary.toLowerCase() &&
      palette.theme.secondary.toLowerCase() === theme.secondary.toLowerCase() &&
      palette.theme.footer.toLowerCase() === theme.footer.toLowerCase() &&
      palette.theme.gold.toLowerCase() === theme.gold.toLowerCase(),
  );
}
