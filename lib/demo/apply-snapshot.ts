import type { MenuSnapshot } from "@/lib/menu/types";
import {
  describeItems,
  matchItems,
  matchTier,
  type MatchableItem,
} from "@/lib/n8n/match";
import { HELP_REPLY, type ParsedCommand } from "@/lib/n8n/parse";

export type SnapshotApply = {
  snapshot: MenuSnapshot;
  status: "applied" | "ambiguous" | "help" | "unknown" | "error";
  reply: string;
  changed: boolean;
};

function itemsOf(snapshot: MenuSnapshot): MatchableItem[] {
  return snapshot.sections.flatMap((section) =>
    section.items.map((item) => ({
      id: item.id,
      name: item.name,
      section_id: section.id,
      section_name: section.name,
      kind: section.kind,
      is_available: item.available,
    })),
  );
}

function unchanged(
  snapshot: MenuSnapshot,
  status: SnapshotApply["status"],
  reply: string,
): SnapshotApply {
  return { snapshot, status, reply, changed: false };
}

export function applyCommandToSnapshot(
  snapshot: MenuSnapshot,
  command: ParsedCommand,
): SnapshotApply {
  if (command.type === "help") return unchanged(snapshot, "help", HELP_REPLY);
  if (command.type === "unknown") {
    return unchanged(snapshot, "unknown", `No entendí el mensaje.\n${HELP_REPLY}`);
  }
  if (command.type === "set_photo") {
    return unchanged(
      snapshot,
      "unknown",
      `Envía la foto junto con: foto ${command.query}`,
    );
  }

  const next = structuredClone(snapshot);

  if (command.type === "set_available" || command.type === "hide_item") {
    const available = command.type === "set_available" ? command.available : false;
    const match = matchItems(itemsOf(next), command.query, command.kind);
    if (match.status === "none") {
      return unchanged(snapshot, "unknown", `No encontré «${command.query}».`);
    }
    if (match.status === "ambiguous") {
      return unchanged(snapshot, "ambiguous", `¿${describeItems(match.items)}?`);
    }
    let changed = false;
    for (const section of next.sections) {
      const item = section.items.find((entry) => entry.id === match.item.id);
      if (!item) continue;
      changed = item.available !== available;
      item.available = available;
    }
    if (changed) next.revision += 1;
    const verb = available ? "ya está disponible" : "quedó agotado";
    return {
      snapshot: changed ? next : snapshot,
      status: "applied",
      reply: `${match.item.name} (${match.item.kind}) ${verb}.`,
      changed,
    };
  }

  if (command.type === "set_price") {
    const tiers = next.priceTiers.map((tier) => ({
      id: tier.id,
      label: tier.label,
      scoop_count: tier.scoops,
      price: tier.price,
    }));
    const match = matchTier(tiers, command);
    if (match.status === "none") return unchanged(snapshot, "unknown", "No encontré ese precio.");
    if (match.status === "ambiguous") {
      return unchanged(
        snapshot,
        "ambiguous",
        `¿${match.tiers.map((tier) => tier.label).join(" o ")}?`,
      );
    }
    const tier = next.priceTiers.find((entry) => entry.id === match.tier.id);
    if (!tier) return unchanged(snapshot, "error", "No encontré ese precio.");
    const changed = tier.price !== command.price;
    tier.price = command.price;
    if (changed) next.revision += 1;
    return {
      snapshot: changed ? next : snapshot,
      status: "applied",
      reply: `${tier.label} quedó en $${command.price.toFixed(2)}.`,
      changed,
    };
  }

  const existing = matchItems(itemsOf(next), command.name, command.kind);
  if (existing.status === "one") {
    return unchanged(
      snapshot,
      "applied",
      `${existing.item.name} ya está en ${existing.item.section_name}.`,
    );
  }
  const section =
    next.sections.find((entry) => entry.kind === (command.kind ?? "agua")) ?? next.sections[0];
  if (!section) return unchanged(snapshot, "error", "No hay secciones en el menú.");
  section.items.push({
    id: `demo-${section.kind}-${section.items.length + 1}`,
    name: command.name,
    available: true,
    animation: "cascade",
  });
  next.revision += 1;
  return {
    snapshot: next,
    status: "applied",
    reply: `Agregué ${command.name} en ${section.name}.`,
    changed: true,
  };
}
