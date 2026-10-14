export const LIST_ICONS = [
  { key: "ice-cream", name: "Helado" },
  { key: "water", name: "Agua" },
  { key: "milk", name: "Leche" },
  { key: "coffee", name: "Café" },
  { key: "soda", name: "Refresco" },
  { key: "burger", name: "Hamburguesa" },
  { key: "pizza", name: "Pizza" },
  { key: "taco", name: "Taco" },
  { key: "salad", name: "Ensalada" },
  { key: "fruit", name: "Fruta" },
  { key: "cake", name: "Pastel" },
  { key: "bread", name: "Pan" },
  { key: "chicken", name: "Pollo" },
  { key: "fish", name: "Pescado" },
  { key: "soup", name: "Sopa" },
  { key: "wine", name: "Vino" },
  { key: "beer", name: "Cerveza" },
  { key: "utensils", name: "Cubiertos" },
  { key: "chef", name: "Chef" },
  { key: "snack", name: "Botana" },
  { key: "sandwich", name: "Sándwich" },
  { key: "noodles", name: "Pasta" },
  { key: "egg", name: "Huevo" },
  { key: "cheese", name: "Queso" },
] as const;

export type ListIcon = (typeof LIST_ICONS)[number]["key"];

export function isListIcon(value: unknown): value is ListIcon {
  return LIST_ICONS.some((icon) => icon.key === value);
}

export function asListIcon(value: unknown, fallback: ListIcon = "ice-cream"): ListIcon {
  return isListIcon(value) ? value : fallback;
}

export function defaultListIcon(kind?: string | null): ListIcon {
  if (kind === "agua") return "water";
  if (kind === "leche") return "milk";
  return "ice-cream";
}

export function resolveHeaderIcon(
  section: {
    id: string;
    kind?: string | null;
    header_icon?: unknown;
    headerIcon?: unknown;
  },
  theme?: unknown,
): ListIcon {
  if (isListIcon(section.header_icon)) return section.header_icon;
  if (isListIcon(section.headerIcon)) return section.headerIcon;
  const fromTheme = sectionIconsFromTheme(theme)[section.id];
  if (fromTheme) return fromTheme;
  return defaultListIcon(section.kind);
}

export function labelForListIcon(value: string) {
  return LIST_ICONS.find((icon) => icon.key === value)?.name ?? "Helado";
}

export function sectionIconsFromTheme(theme: unknown): Record<string, ListIcon> {
  if (!theme || typeof theme !== "object") return {};
  const raw = (theme as Record<string, unknown>).sectionIcons;
  if (!raw || typeof raw !== "object") return {};
  const next: Record<string, ListIcon> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (id && isListIcon(value)) next[id] = value;
  }
  return next;
}

export function themeWithSectionIcon(
  theme: Record<string, unknown> | null | undefined,
  sectionId: string,
  icon: ListIcon,
) {
  return {
    ...(theme ?? {}),
    sectionIcons: {
      ...sectionIconsFromTheme(theme),
      [sectionId]: icon,
    },
  };
}

export function missingIconColumn(error?: { message?: string; code?: string } | null) {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("header_icon") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}
