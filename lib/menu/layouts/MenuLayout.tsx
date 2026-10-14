"use client";

import { ClassicSplitLayout } from "@/components/display/ClassicSplitLayout";
import { BoardCycle } from "@/lib/menu/cycle";
import { CardListLayout } from "@/lib/menu/layouts/CardListLayout";
import { NightBoardLayout } from "@/lib/menu/layouts/NightBoardLayout";
import { PhotoGridLayout } from "@/lib/menu/layouts/PhotoGridLayout";
import { PromoHeroLayout } from "@/lib/menu/layouts/PromoHeroLayout";
import { RowPromoLayout } from "@/lib/menu/layouts/RowPromoLayout";
import type { MenuSnapshot } from "@/lib/menu/types";

export function MenuLayout({ menu }: { menu: MenuSnapshot }) {
  return (
    <BoardCycle>
      <LayoutSwitch menu={menu} />
    </BoardCycle>
  );
}

function LayoutSwitch({ menu }: { menu: MenuSnapshot }) {
  switch (menu.layoutKey) {
    case "photo-grid":
      return <PhotoGridLayout menu={menu} />;
    case "promo-hero":
      return <PromoHeroLayout menu={menu} />;
    case "row-promo":
      return <RowPromoLayout menu={menu} />;
    case "card-list":
      return <CardListLayout menu={menu} />;
    case "night-board":
      return <NightBoardLayout menu={menu} />;
    default:
      return <ClassicSplitLayout menu={menu} />;
  }
}
