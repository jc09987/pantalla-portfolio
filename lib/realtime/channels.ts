export function storeChannelName(slug: string) {
  return `pantalla:${slug}`;
}

export const FORCE_RELOAD_EVENT = "force-reload";

export type PresenceMeta = {
  role: "tv" | "admin";
  startedAt: number;
};
