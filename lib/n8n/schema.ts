import type { SectionKind } from "@/lib/menu/types";
import { foldText, parsePriceAmount } from "@/lib/n8n/normalize";
import type { ParsedCommand } from "@/lib/n8n/parse";

/**
 * The only object a model may return. Any other key or type is rejected
 * and is never applied.
 */
const FIELDS: Record<ParsedCommand["type"], readonly string[]> = {
  help: ["type"],
  unknown: ["type"],
  set_available: ["type", "query", "available", "kind"],
  hide_item: ["type", "query", "kind"],
  set_price: ["type", "price", "scoopCount", "labelQuery"],
  add_item: ["type", "name", "kind"],
  set_photo: ["type", "query", "kind"],
};

const TYPES = new Set(Object.keys(FIELDS));

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function kindOf(value: unknown): SectionKind | undefined | null {
  if (value == null) return undefined;
  if (value === "agua" || value === "leche") return value;
  return null;
}

function queryOf(value: unknown) {
  if (typeof value !== "string") return null;
  const query = foldText(value);
  if (query.length < 2 || query.length > 60) return null;
  return query;
}

function nameOf(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 40) return null;
  return name;
}

export function acceptModelCommand(value: unknown): ParsedCommand | null {
  if (!isRecord(value)) return null;
  const type = value.type;
  if (typeof type !== "string" || !TYPES.has(type)) return null;
  const allowed = new Set(FIELDS[type as ParsedCommand["type"]]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) return null;
  }

  if (type === "help") return { type: "help" };
  if (type === "unknown") return { type: "unknown" };

  const kind = kindOf(value.kind);
  if (kind === null) return null;

  if (type === "set_available") {
    const query = queryOf(value.query);
    if (!query || typeof value.available !== "boolean") return null;
    return { type: "set_available", query, available: value.available, kind };
  }

  if (type === "hide_item") {
    const query = queryOf(value.query);
    if (!query) return null;
    return { type: "hide_item", query, kind };
  }

  if (type === "set_photo") {
    const query = queryOf(value.query);
    if (!query) return null;
    return { type: "set_photo", query, kind };
  }

  if (type === "add_item") {
    const name = nameOf(value.name);
    if (!name) return null;
    return { type: "add_item", name, kind };
  }

  if (type !== "set_price") return null;
  if (typeof value.price !== "number" || !Number.isFinite(value.price)) return null;
  const price = parsePriceAmount(String(value.price));
  if (price == null) return null;

  let scoopCount: number | undefined;
  if (value.scoopCount != null) {
    if (typeof value.scoopCount !== "number" || !Number.isInteger(value.scoopCount)) return null;
    if (value.scoopCount < 1 || value.scoopCount > 6) return null;
    scoopCount = value.scoopCount;
  }
  let labelQuery: string | undefined;
  if (value.labelQuery != null) {
    const label = queryOf(value.labelQuery);
    if (!label) return null;
    labelQuery = label;
  }
  if (scoopCount == null && !labelQuery) return null;
  return { type: "set_price", price, scoopCount, labelQuery };
}

export const COMMAND_SCHEMA_TEXT = `{
  "type": "set_available", "query": "mango", "available": false, "kind": "leche"
} | {
  "type": "set_price", "scoopCount": 2, "price": 4.5
} | {
  "type": "set_price", "labelQuery": "2 scoops", "price": 4.5
} | {
  "type": "add_item", "name": "Horchata", "kind": "leche"
} | {
  "type": "set_photo", "query": "chocolate", "kind": "leche"
} | {
  "type": "hide_item", "query": "gansito"
} | { "type": "help" } | { "type": "unknown" }`;
