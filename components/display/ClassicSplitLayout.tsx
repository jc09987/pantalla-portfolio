"use client";

import { FeatureGlyph } from "@/components/display/icons";
import { usePortrait } from "@/lib/display/orientation";
import { CycleCopy, themeVars } from "@/lib/menu/cycle";
import { BrandHeader, ClassicLayoutCanvas, hasComponent } from "@/lib/menu/layouts/BoardBlocks";
import type { MenuSnapshot } from "@/lib/menu/types";

export function ClassicSplitLayout({ menu }: { menu: MenuSnapshot }) {
  const { theme } = menu;
  const portrait = usePortrait();
  const showPrices = !hasComponent(menu, "prices");
  const showHeroRail = !hasComponent(menu, "heroes");

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-[var(--micho-surface)] text-[var(--micho-ink)]"
      style={themeVars(theme)}
    >
      <div className="relative shrink-0">
        <span className="confetti confetti-a" />
        <span className="confetti confetti-b" />
        <span className="confetti confetti-c" />
        <span className="confetti confetti-d" />
        <BrandHeader menu={menu} showPrices={showPrices} />
      </div>
      <ClassicLayoutCanvas menu={menu} showHeroRail={showHeroRail} />
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
          className={`font-script text-[var(--micho-gold)] ${
            portrait ? "text-right text-[28px]" : "text-[36px]"
          }`}
        >
          <CycleCopy>{menu.closing}</CycleCopy>
        </p>
      </footer>
    </div>
  );
}
