"use client";

import { OrientationProvider } from "@/lib/display/orientation";
import {
  STAGE,
  orientationFromSize,
  parseOrientation,
  stageScale,
  type StageOrientation,
} from "@/lib/display/stage";
import { useEffect, useRef, useState } from "react";

export function DisplayShell({
  children,
  kiosk = true,
  boardOrientation,
}: {
  children: React.ReactNode;
  kiosk?: boolean;
  boardOrientation?: StageOrientation;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number | null>(null);
  const [scale, setScale] = useState(0);
  const [orientation, setOrientation] = useState<StageOrientation>("landscape");
  const stage = STAGE[orientation];

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add("pantalla-fit");
    body.classList.add("pantalla-fit");
    return () => {
      root.classList.remove("pantalla-fit");
      body.classList.remove("pantalla-fit");
    };
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const fit = () => {
      const params = new URLSearchParams(window.location.search);
      const forced = parseOrientation(params.get("orient"));
      const embedded = params.get("embed") === "1";
      const width = box.clientWidth;
      const height = box.clientHeight;
      const next = forced ?? boardOrientation ?? orientationFromSize(width, height);
      setOrientation(next);
      setScale(embedded ? 1 : stageScale(width, height, next));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, [boardOrientation]);

  useEffect(() => {
    if (!kiosk) return;
    const root = document.documentElement;
    root.classList.add("pantalla-kiosk");

    const showCursor = () => {
      root.classList.remove("pantalla-cursor-hidden");
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        root.classList.add("pantalla-cursor-hidden");
      }, 3000);
    };

    showCursor();
    window.addEventListener("mousemove", showCursor);
    window.addEventListener("pointerdown", showCursor);

    let lock: WakeLockSentinel | null = null;
    const requestLock = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* TVs and some browsers reject Wake Lock; ignore. */
      }
    };
    void requestLock();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void requestLock();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      root.classList.remove("pantalla-kiosk", "pantalla-cursor-hidden");
      window.removeEventListener("mousemove", showCursor);
      window.removeEventListener("pointerdown", showCursor);
      document.removeEventListener("visibilitychange", onVisibility);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      void lock?.release();
    };
  }, [kiosk]);

  return (
    <OrientationProvider value={orientation}>
      <div
        ref={boxRef}
        className="pantalla-letterbox"
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          className="pantalla-stage-slot"
          style={{
            width: stage.width * scale,
            height: stage.height * scale,
            opacity: scale > 0 ? 1 : 0,
          }}
        >
          <div
            className="pantalla-stage"
            data-orient={orientation}
            style={{
              width: stage.width,
              height: stage.height,
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </OrientationProvider>
  );
}
