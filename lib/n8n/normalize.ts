import type { SectionKind } from "@/lib/menu/types";

export function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeWhatsApp(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  const stripped = digits.replace(/^\+/, "").replace(/^00/, "");
  return stripped ? `+${stripped}` : "";
}

export function normalizeSender(channel: "whatsapp" | "email", value: string) {
  return channel === "email" ? normalizeEmail(value) : normalizeWhatsApp(value);
}

export function splitKind(query: string): { stem: string; kind?: SectionKind } {
  const folded = foldText(query);
  const match = folded.match(/^(.*?)\s+(?:de\s+)?(agua|leche)$/);
  if (match?.[1]?.trim() && match[2]) {
    return { stem: match[1].trim(), kind: match[2] as SectionKind };
  }
  return { stem: folded };
}

export function parsePriceAmount(raw: string) {
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0 || value > 9999) return null;
  return Math.round(value * 100) / 100;
}