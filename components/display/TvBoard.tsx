"use client";

import { DisplayShell } from "@/components/display/DisplayShell";
import { LiveMenu } from "@/components/display/LiveMenu";
import {
  asStageOrientation,
  type StageOrientation,
} from "@/lib/display/stage";
import type { MenuSnapshot } from "@/lib/menu/types";
import { useState } from "react";

export function TvBoard({
  slug,
  snapshot,
  live,
  kiosk,
}: {
  slug: string;
  snapshot: MenuSnapshot;
  live: boolean;
  kiosk?: boolean;
}) {
  const [boardOrientation, setBoardOrientation] = useState<StageOrientation>(
    asStageOrientation(snapshot.orientation),
  );

  return (
    <DisplayShell kiosk={kiosk ?? live} boardOrientation={boardOrientation}>
      <LiveMenu
        slug={slug}
        initial={snapshot}
        live={live}
        onSnapshot={(next) => {
          setBoardOrientation(asStageOrientation(next.orientation));
        }}
      />
    </DisplayShell>
  );
}
