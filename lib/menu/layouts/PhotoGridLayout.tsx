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

const MOSAIC_PAGE_SIZE = 8;

function mosaicItems(menu: MenuSnapshot) {
  return menu.sections.flatMap((section) => {
    const component = asSectionComponent(section.component);
    if (component === "promo" || component === "prices" || component === "heroes") return [];
    return section.items.filter((item) => item.available);
  });
}

export function PhotoGridLayout({ menu }: { menu: MenuSnapshot }) {
  const portrait = usePortrait();
  const items = mosaicItems(menu);
  const page = useCycledPage(items, MOSAIC_PAGE_SIZE);
  const visible = page.items;
  const columns = portrait
    ? visible.length <= 1 ? 1 : 2
    : visible.length <= 1
      ? 1
      : visible.length <= 4
        ? 2
        : visible.length <= 6
          ? 3
          : 4;
  const rows = Math.max(1, Math.ceil(visible.length / columns));
  const fallback = menu.priceTiers[0]?.price ?? null;

  return (
    <BoardFrame menu={menu}>
      <BrandHeader menu={menu} compact showPrices />
      <main
        className={`grid min-h-0 flex-1 gap-4 pb-4 ${portrait ? "px-6" : "px-10"}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {visible.map((item, index) => {
          const urls = productUrls(item);
          const price = item.price ?? fallback;
          return (
            <article
              key={`${item.id}-${page.page}`}
              className="relative min-h-0 overflow-hidden rounded-[28px] border-[4px] border-[var(--micho-pink)] bg-[#2a1548]"
            >
              {urls.length ? (
                <ProductMedia
                  urls={urls}
                  alt={item.name}
                  variant="promo"
                  offset={index}
                  className="product-media-mosaic h-full w-full"
                  sizes="640px"
                />
              ) : (
                <div className="grid h-full place-items-center bg-[#fff4fb]">
                  <IceCreamCup scoopColors={["#ff6ba8", "#ffd54a"]} size="md" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-5 pb-5 pt-16 text-white">
                <p className={`font-display leading-none ${portrait ? "text-[28px]" : "text-[36px]"}`}>
                  <CycleCopy delay={index * 40}>{item.name}</CycleCopy>
                </p>
                {item.description ? (
                  <p className="mt-1 truncate text-[18px] font-bold text-white/85">
                    <CycleCopy delay={index * 40 + 30}>{item.description}</CycleCopy>
                  </p>
                ) : null}
                {price != null ? (
                  <p className="mt-2 font-display text-[32px] leading-none text-[var(--micho-gold)]">
                    {formatBoardPrice(price)}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </main>
    </BoardFrame>
  );
}
