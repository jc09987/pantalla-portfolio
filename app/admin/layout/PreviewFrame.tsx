"use client";

import { STAGE, stageScale, type StageOrientation } from "@/lib/display/stage";
import { useEffect, useRef, useState } from "react";
import { BusyOverlay } from "@/app/admin/ui";

export function PreviewFrame({
  src,
  orientation = "landscape",
}: {
  src: string;
  orientation?: StageOrientation;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const stage = STAGE[orientation];

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => {
      setScale(stageScale(box.clientWidth, box.clientHeight, orientation));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [orientation]);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div
      ref={boxRef}
      className={`relative overflow-hidden rounded-2xl border border-zinc-200 bg-black ${
        orientation === "portrait" ? "mx-auto w-full max-w-[420px]" : "w-full"
      }`}
      style={{
        aspectRatio: orientation === "portrait" ? "9 / 16" : "16 / 9",
      }}
    >
      <BusyOverlay show={!loaded} label="Cargando vista previa…" />
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={{
          width: stage.width * scale,
          height: stage.height * scale,
          transform: "translate(-50%, -50%)",
          opacity: scale > 0 && loaded ? 1 : 0,
        }}
      >
        <iframe
          title="Vista previa del menú"
          src={src}
          width={stage.width}
          height={stage.height}
          className="absolute top-0 left-0 border-0"
          onLoad={() => setLoaded(true)}
          style={{
            width: stage.width,
            height: stage.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
