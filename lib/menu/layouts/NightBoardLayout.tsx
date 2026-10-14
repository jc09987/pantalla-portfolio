"use client";

import { IceCreamCup } from "@/components/display/IceCreamCup";
import { usePortrait } from "@/lib/display/orientation";
import {
  CycleCopy,
  ProductMedia,
  productUrls,
  themeVars,
  useCycledPage,
} from "@/lib/menu/cycle";
import { BrandHeader } from "@/lib/menu/layouts/BoardBlocks";
import { formatBoardPrice } from "@/lib/menu/layouts/BoardFrame";
import { asSectionComponent } from "@/lib/menu/sections";
import type { MenuSnapshot } from "@/lib/menu/types";

const NIGHT_LIST_PAGE_SIZE = 8;

function nightItems(menu: MenuSnapshot) {
  return menu.sections.flatMap((section) => {
    const component = asSectionComponent(section.component);
    if (component === "prices" || component === "heroes") return [];
    return section.items.filter((item) => item.available);
  });
}

export function NightBoardLayout({ menu }: { menu: MenuSnapshot }) {
  const portrait = usePortrait();
  const items = nightItems(menu);
  const page = useCycledPage(items, NIGHT_LIST_PAGE_SIZE);
  const featured =
    page.items.find((item) => productUrls(item).length) ?? page.items[0] ?? null;
  const featuredUrls = featured ? productUrls(featured) : [];
  const heroUrls = menu.heroes
    .map((hero) => hero.imageUrl)
    .filter((url): url is string => Boolean(url));
  const photoUrls = featuredUrls.length ? featuredUrls : heroUrls;
  const fallback = menu.priceTiers[0]?.price ?? null;
  const featuredPrice = featured?.price ?? fallback;

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-[var(--micho-surface)] text-[var(--micho-ink)]"
      style={themeVars({
        ...menu.theme,
        surface: "#0b1220",
        ink: "#f8fafc",
        footer: menu.theme.footer === "#ffffff" ? "#020617" : menu.theme.footer,
      })}
    >
      <BrandHeader menu={menu} compact showPrices />
      <main
        className={`grid min-h-0 flex-1 gap-6 pb-4 ${
          portrait ? "grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)] px-6" : "grid-cols-[1.15fr_0.85fr] px-10"
        }`}
      >
        <section className="relative min-h-0 overflow-hidden rounded-[28px] border-[3px] border-white/15 bg-black">
          {photoUrls.length ? (
            <ProductMedia
              urls={photoUrls}
              alt={featured?.name ?? menu.brand.title}
              variant="promo"
              className="h-full w-full"
              sizes="1100px"
            />
          ) : (
            <div className="grid h-full place-items-center bg-[#111827]">
              <IceCreamCup
                scoopColors={["#ff4d6d", "#ffd54a"]}
                size="lg"
                garnish={menu.heroes[0]?.variant ?? "none"}
              />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/50 to-transparent px-8 pb-7 pt-24">
            <p className={`font-display leading-none text-white ${portrait ? "text-[40px]" : "text-[52px]"}`}>
              <CycleCopy>{featured?.name ?? menu.brand.title}</CycleCopy>
            </p>
            {featured?.description ? (
              <p className="mt-2 max-w-[640px] text-[22px] font-bold text-white/80">
                <CycleCopy delay={40}>{featured.description}</CycleCopy>
              </p>
            ) : null}
            {featuredPrice != null ? (
              <p className="mt-3 font-display text-[40px] leading-none text-[var(--micho-gold)]">
                {formatBoardPrice(featuredPrice)}
              </p>
            ) : null}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border-[3px] border-dashed border-white/20 bg-black/35 px-7 py-5">
          <p className="font-script mb-4 text-[32px] text-[var(--micho-gold)]">
            <CycleCopy>{menu.brand.subtitle}</CycleCopy>
          </p>
          <ul className="flex min-h-0 flex-1 flex-col justify-evenly">
            {page.items.map((item, index) => {
              const price = item.price ?? fallback;
              return (
                <li
                  key={`${item.id}-${page.page}`}
                  className="flex items-baseline justify-between gap-4 border-b border-dashed border-white/15 py-2 last:border-b-0"
                >
                  <p className={`min-w-0 truncate font-display leading-none text-white ${portrait ? "text-[26px]" : "text-[30px]"}`}>
                    <CycleCopy delay={index * 35}>{item.name}</CycleCopy>
                  </p>
                  {price != null ? (
                    <p className="shrink-0 font-display text-[28px] leading-none text-[var(--micho-gold)]">
                      {formatBoardPrice(price)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </aside>
      </main>
      <footer
        className={`flex bg-black/40 ${
          portrait
            ? "h-auto flex-col items-stretch gap-2 px-6 py-4"
            : "h-[84px] items-center justify-between px-10"
        }`}
      >
        <p className="text-[20px] font-extrabold tracking-wide text-white/80">{menu.brand.ribbon}</p>
        <p className={`font-script text-[var(--micho-gold)] ${portrait ? "text-[28px]" : "text-[32px]"}`}>
          <CycleCopy>{menu.closing}</CycleCopy>
        </p>
      </footer>
    </div>
  );
}
