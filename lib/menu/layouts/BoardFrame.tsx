"use client";

import { FeatureGlyph } from "@/components/display/icons";
import { usePortrait } from "@/lib/display/orientation";
import { themeVars } from "@/lib/menu/cycle";
import type { MenuSnapshot } from "@/lib/menu/types";
import type { ReactNode } from "react";

export function formatBoardPrice(value: number) {
  return `$${value.toFixed(2)}`;
}

export function BoardFrame({
  menu,
  children,
}: {
  menu: MenuSnapshot;
  children: ReactNode;
}) {
  const { theme } = menu;
  const portrait = usePortrait();

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-[var(--micho-surface)] text-[var(--micho-ink)]"
      style={themeVars(theme)}
    >
      {children}
      <footer
        className={`relative z-20 flex shrink-0 bg-[var(--micho-footer)] ${
          portrait
            ? "h-auto flex-col items-stretch gap-2 px-6 py-3"
            : "h-[92px] items-center justify-between px-10"
        }`}
      >
        <div
          className={
            portrait
              ? "grid grid-cols-2 gap-x-4 gap-y-2"
              : "flex flex-1 items-center justify-between gap-6 pr-10"
          }
        >
          {menu.features.map((feature) => (
            <div key={feature.id} className="flex items-center gap-3 text-white">
              <FeatureGlyph icon={feature.icon} />
              <p className={`font-extrabold tracking-wide ${portrait ? "text-[16px]" : "text-[18px]"}`}>
                {feature.label}
              </p>
            </div>
          ))}
        </div>
        <p
          className={`font-script flex shrink-0 items-center gap-2 text-[var(--micho-gold)] ${
            portrait ? "justify-end text-[28px]" : "text-[36px]"
          }`}
        >
          {menu.closing}
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--micho-pink)]" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 21 C5 15 2 11 2 7 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 c0 4 -3 8 -10 14 Z"
            />
          </svg>
        </p>
      </footer>
    </div>
  );
}
