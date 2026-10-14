import type { SectionKind } from "@/lib/menu/types";
import { foldText } from "@/lib/n8n/normalize";

export type MatchableItem = {
  id: string;
  name: string;
  section_id: string;
  section_name: string;
  kind: SectionKind;
  is_available: boolean;
};

export type MatchableTier = {
  id: string;
  label: string;
  scoop_count: number;
  price: number;
};

export type ItemMatch =
  | { status: "one"; item: MatchableItem }
  | { status: "ambiguous"; items: MatchableItem[] }
  | { status: "none" };

export type TierMatch =
  | { status: "one"; tier: MatchableTier }
  | { status: "ambiguous"; tiers: MatchableTier[] }
  | { status: "none" };

function scoreName(name: string, query: string) {
  const folded = foldText(name);
  if (folded === query) return 3;
  if (folded.startsWith(query)) return 2;
  if (folded.includes(query)) return 1;
  return 0;
}

export function matchItems(
  items: MatchableItem[],
  query: string,
  kind?: SectionKind,
): ItemMatch {
  const foldedQuery = foldText(query);
  const pool = kind ? items.filter((item) => item.kind === kind) : items;
  const ranked = pool
    .map((item) => ({ item, score: scoreName(item.name, foldedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return { status: "none" };

  const best = ranked[0].score;
  const top = ranked.filter((entry) => entry.score === best).map((entry) => entry.item);
  if (top.length === 1) return { status: "one", item: top[0] };
  return { status: "ambiguous", items: top };
}

export function describeItems(items: MatchableItem[]) {
  return items.map((item) => `${item.name} ${item.kind}`).join(" o ");
}

export function matchTier(
  tiers: MatchableTier[],
  input: { scoopCount?: number; labelQuery?: string },
): TierMatch {
  if (input.scoopCount != null) {
    const hits = tiers.filter((tier) => tier.scoop_count === input.scoopCount);
    if (hits.length === 1) return { status: "one", tier: hits[0] };
    if (hits.length > 1) return { status: "ambiguous", tiers: hits };
  }

  if (input.labelQuery) {
    const query = foldText(input.labelQuery);
    const ranked = tiers
      .map((tier) => ({
        tier,
        score: Math.max(scoreName(tier.label, query), scoreName(`${tier.scoop_count}`, query)),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    if (ranked.length === 0) return { status: "none" };
    const best = ranked[0].score;
    const top = ranked.filter((entry) => entry.score === best).map((entry) => entry.tier);
    if (top.length === 1) return { status: "one", tier: top[0] };
    return { status: "ambiguous", tiers: top };
  }

  return { status: "none" };
}