import type { SectionKind } from "@/lib/menu/types";
import { foldText, parsePriceAmount, splitKind } from "@/lib/n8n/normalize";

export const HELP_REPLY = [
  "Comandos:",
  "• agotado mango",
  "• disponible mango",
  "• precio 2 bolas 3.99",
  "• nuevo sabor: mamey",
  "• quita tamarindo",
  "• foto mango (con imagen)",
].join("\n");

export type ParsedCommand =
  | { type: "help" }
  | { type: "unknown" }
  | { type: "set_available"; query: string; kind?: SectionKind; available: boolean }
  | { type: "hide_item"; query: string; kind?: SectionKind }
  | { type: "set_price"; scoopCount?: number; labelQuery?: string; price: number }
  | { type: "add_item"; name: string; kind?: SectionKind }
  | { type: "set_photo"; query: string; kind?: SectionKind };

function withKind(query: string) {
  const { stem, kind } = splitKind(query);
  return { query: stem, kind };
}

export function parseCommand(text: string): ParsedCommand {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const folded = foldText(trimmed);
  if (!folded || folded === "ayuda" || folded === "help" || folded === "comandos") {
    return { type: "help" };
  }

  const soldOut = trimmed.match(/^(?:agotado|no hay|se acab[oó])\s+(.+)$/i);
  if (soldOut?.[1]) {
    return { type: "set_available", available: false, ...withKind(soldOut[1]) };
  }

  const available = trimmed.match(/^(?:disponible|hay|activar?)\s+(.+)$/i);
  if (available?.[1]) {
    return { type: "set_available", available: true, ...withKind(available[1]) };
  }

  const hide = trimmed.match(/^(?:quita(?:r)?|oculta(?:r)?)\s+(.+)$/i);
  if (hide?.[1]) {
    return { type: "hide_item", ...withKind(hide[1]) };
  }

  const photo = trimmed.match(/^(?:foto|imagen)(?:\s+de)?\s+(.+)$/i);
  if (photo?.[1]) {
    return { type: "set_photo", ...withKind(photo[1]) };
  }

  const pricedScoops = folded.match(/^precio\s+(\d+)\s*(?:bolas?|scoops?)\s+(\d+(?:[.,]\d{1,2})?)$/);
  if (pricedScoops?.[1] && pricedScoops[2]) {
    const price = parsePriceAmount(pricedScoops[2]);
    if (price == null) return { type: "unknown" };
    return { type: "set_price", scoopCount: Number(pricedScoops[1]), price };
  }

  const pricedLabel = folded.match(/^precio\s+(.+?)\s+(\d+(?:[.,]\d{1,2})?)$/);
  if (pricedLabel?.[1] && pricedLabel[2]) {
    const price = parsePriceAmount(pricedLabel[2]);
    if (price == null) return { type: "unknown" };
    return { type: "set_price", labelQuery: pricedLabel[1], price };
  }

  const add =
    trimmed.match(/^nuevo sabor(?:\s+(agua|leche))?\s*[:\-]\s*(.+)$/i) ??
    trimmed.match(/^nuevo sabor(?:\s+(agua|leche))?\s+(.+)$/i) ??
    trimmed.match(/^agrega(?:r)? sabor(?:\s+(agua|leche))?\s*[:\-]?\s*(.+)$/i);
  if (add?.[2]) {
    const name = add[2].replace(/^[:\-]\s*/, "").trim();
    if (name.length < 2 || name.length > 40) return { type: "unknown" };
    const kind = add[1] ? (foldText(add[1]) as SectionKind) : undefined;
    return { type: "add_item", name, kind };
  }

  return { type: "unknown" };
}