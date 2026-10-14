"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StageOrientation } from "@/lib/display/stage";

const OrientationContext = createContext<StageOrientation>("landscape");

export function OrientationProvider({
  value,
  children,
}: {
  value: StageOrientation;
  children: ReactNode;
}) {
  return <OrientationContext.Provider value={value}>{children}</OrientationContext.Provider>;
}

export function useOrientation() {
  return useContext(OrientationContext);
}

export function usePortrait() {
  return useOrientation() === "portrait";
}
