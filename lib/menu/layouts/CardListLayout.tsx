"use client";

import { IceCreamCup } from "@/components/display/IceCreamCup";
import { usePortrait } from "@/lib/display/orientation";
import {
  CycleCopy,
  ProductMedia,
  productUrls,
  useCycledPage,
} from "@/lib/menu/cycle";
import { BrandHeader } from "@/lib/menu/layouts/BoardBlocks";
import { BoardFrame, formatBoardPrice } from "@/lib/menu/layouts/BoardFrame";
import { asSectionComponent } from "@/lib/menu/sections";
import type { MenuSnapshot } from "@/lib/menu/types";

const CARD_LIST_PAGE_SIZE = 4;

function cardListItems(menu: MenuSnapshot) {
  return menu.sections.flatMap((section) => {
    const component = asSectionComponent(section.component);
    if (component === "prices" || component === "heroes") return [];
    return section.items.filter((item) => item.available).map((item) => ({
      ...item,
      kind: section.kind,
    }));
  });
}

export function CardListLayout({ menu }: { menu: MenuSnapshot }) {
  const portrait = usePortrait();
  const items = cardListItems(menu);
  const pageSize = portrait ? 6 : CARD_LIST_PAGE_SIZE;
  const page = useCycledPage(items, pageSize);
  const rows = Math.max(page.items.length, 1);
  const fallback = menu.priceTiers[0]?.price ?? null;

  return (
    <BoardFrame menu={menu}>
      <BrandHeader menu={menu} compact showPrices />
      <main
        className={`grid min-h-0 flex-1 gap-3 pb-4 ${portrait ? "px-6" : "px-10"}`}
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {page.items.map((item, index) => {
          const urls = productUrls(item);
          const price = item.price ?? fallback;
          const accent = item.kind === "agua" ? "var(--micho-blue)" : "var(--micho-pink)";
          return (
            <article
              key={`${item.id}-${page.page}`}
              className="grid min-h-0 overflow-hidden rounded-[28px] border-[3px] bg-white"
              style={{
                borderColor: accent,
                gridTemplateColumns: portrait
                  ? "minmax(0, 200px) minmax(0, 1fr) auto"
                  : "minmax(0, 240px) minmax(0, 1fr) auto",
              }}
            >
              <div className="relative min-h-0 overflow-hidden bg-[#fff4fb]">
                {urls.length ? (
                  <ProductMedia
                    urls={urls}
                    alt={item.name}
                    offset={index}
                    className="h-full w-full"
                    sizes="240px"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <IceCreamCup scoopColors={["#ff6ba8", "#ffd54a"]} size="sm" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col justify-center px-6">
                <p className={`font-display leading-none ${portrait ? "text-[32px]" : "text-[42px]"}`} style={{ color: accent }}>
                  <CycleCopy delay={index * 40}>{item.name}</CycleCopy>
                </p>
                {item.description ? (
                  <p className="mt-2 truncate text-[22px] font-bold text-[var(--micho-ink)]/70">
                    <CycleCopy delay={index * 40 + 30}>{item.description}</CycleCopy>
                  </p>
                ) : null}
              </div>
              {price != null ? (
                <p className={`flex items-center pr-6 font-display leading-none text-[var(--micho-gold)] ${portrait ? "text-[40px]" : "text-[52px]"}`}>
                  {formatBoardPrice(price)}
                </p>
              ) : (
                <span />
              )}
            </article>
          );
        })}
      </main>
    </BoardFrame>
  );
}
