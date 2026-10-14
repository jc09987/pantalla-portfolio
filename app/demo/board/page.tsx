"use client";

import { TvBoard } from "@/components/display/TvBoard";
import { LA_MICHOACANA_SNAPSHOT } from "@/lib/menu/seeds/la-michoacana";
import type { MenuSnapshot } from "@/lib/menu/types";
import { useEffect, useState } from "react";

export default function DemoBoardPage() {
  const [snapshot, setSnapshot] = useState<MenuSnapshot>(LA_MICHOACANA_SNAPSHOT);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; snapshot?: MenuSnapshot };
      if (data?.type !== "pantalla-demo-snapshot" || data.snapshot?.store?.slug !== "la-michoacana") {
        return;
      }
      setSnapshot(data.snapshot);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <TvBoard
      key={snapshot.revision}
      slug="la-michoacana"
      snapshot={snapshot}
      live={false}
      kiosk
    />
  );
}
