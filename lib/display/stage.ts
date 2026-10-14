export type StageOrientation = "landscape" | "portrait";

export const STAGE = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
} as const;

export const STAGE_WIDTH = STAGE.landscape.width;
export const STAGE_HEIGHT = STAGE.landscape.height;

export function parseOrientation(value: string | null | undefined): StageOrientation | null {
  if (value === "portrait" || value === "landscape") return value;
  return null;
}

export function asStageOrientation(value: string | null | undefined): StageOrientation {
  return parseOrientation(value) ?? "landscape";
}

export function orientationFromRecord(record: {
  orientation?: unknown;
  theme?: unknown;
} | null | undefined): StageOrientation {
  const fromColumn = parseOrientation(
    typeof record?.orientation === "string" ? record.orientation : null,
  );
  if (fromColumn) return fromColumn;
  const theme = record?.theme;
  if (theme && typeof theme === "object" && theme !== null && "orientation" in theme) {
    const value = (theme as { orientation?: unknown }).orientation;
    return asStageOrientation(typeof value === "string" ? value : null);
  }
  return "landscape";
}

export function orientationFromSize(width: number, height: number): StageOrientation {
  if (width <= 0 || height <= 0) return "landscape";
  return height > width ? "portrait" : "landscape";
}

export function stageScale(
  width: number,
  height: number,
  orientation: StageOrientation = "landscape",
) {
  if (width <= 0 || height <= 0) return 0;
  const stage = STAGE[orientation];
  return Math.min(width / stage.width, height / stage.height);
}
