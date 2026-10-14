"use client";

import { useCycledPage } from "@/lib/menu/cycle";
import { usePortrait } from "@/lib/display/orientation";
import { BrandHeader, PromoStripe } from "@/lib/menu/layouts/BoardBlocks";
import { BoardFrame } from "@/lib/menu/layouts/BoardFrame";
import { asSectionComponent } from "@/lib/menu/sections";
import type { MenuSnapshot } from "@/lib/menu/types";

const ROW_PROMO_PAGE_SIZE = 3;

function rowPromoItems(menu: MenuSnapshot) {
  return menu.sections.flatMap((section) => {
    const component = asSectionComponent(section.component);
    if (component === "prices" || component === "heroes") return [];
    return section.items.filter((item) => item.available);
  });
}

export function RowPromoLayout({ menu }: { menu: MenuSnapshot }) {
  const portrait = usePortrait();
  const items = rowPromoItems(menu);
  const pageSize = portrait ? 4 : ROW_PROMO_PAGE_SIZE;
  const page = useCycledPage(items, pageSize);
  const rows = Math.max(page.items.length, 1);

  return (
    <BoardFrame menu={menu}>
      <BrandHeader menu={menu} compact showPrices />
      <main
        className={`grid min-h-0 flex-1 gap-3 pb-4 ${portrait ? "px-6" : "px-10"}`}
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {page.items.map((item, index) => (
          <PromoStripe
            key={`${item.id}-${page.page}`}
            item={item}
            menu={menu}
            index={index}
          />
        ))}
      </main>
    </BoardFrame>
  );
}
