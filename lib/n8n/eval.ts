import { foldText } from "@/lib/n8n/normalize";
import type { ParsedCommand } from "@/lib/n8n/parse";

export type ExpectedCommand = {
  type: ParsedCommand["type"];
  query?: string;
  name?: string;
  available?: boolean;
  kind?: "agua" | "leche";
  price?: number;
  scoopCount?: number;
  labelQuery?: string;
};

function sameText(actual: string | undefined, expected: string | undefined) {
  if (!expected) return true;
  return foldText(actual ?? "") === foldText(expected);
}

export function commandMatches(actual: ParsedCommand, expected: ExpectedCommand) {
  if (actual.type !== expected.type) return false;
  if (actual.type === "help" || actual.type === "unknown") return true;

  if (expected.kind) {
    const kind = "kind" in actual ? actual.kind : undefined;
    if (kind !== expected.kind) return false;
  }

  if (actual.type === "set_available") {
    if (typeof expected.available === "boolean" && actual.available !== expected.available) {
      return false;
    }
    return sameText(actual.query, expected.query);
  }

  if (actual.type === "hide_item" || actual.type === "set_photo") {
    return sameText(actual.query, expected.query);
  }

  if (actual.type === "add_item") return sameText(actual.name, expected.name);

  if (expected.price != null && actual.price !== expected.price) return false;
  if (expected.scoopCount != null && actual.scoopCount !== expected.scoopCount) return false;
  return sameText(actual.labelQuery, expected.labelQuery);
}
