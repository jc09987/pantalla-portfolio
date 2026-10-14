"use client";

import { IceCreamCup } from "@/components/display/IceCreamCup";
import { usePortrait } from "@/lib/display/orientation";
import { BoardFrame, formatBoardPrice } from "@/lib/menu/layouts/BoardFrame";
import {
  CycleCopy,
  ProductMedia,
  flattenProductSlides,
  useCycledIndex,
} from "@/lib/menu/cycle";
import { LayoutCanvas, PricesStrip, hasComponent, productSections } from "@/lib/menu/layouts/BoardBlocks";
import type { MenuSnapshot } from "@/lib/menu/types";

export function PromoHeroLayout({ menu }: { menu: MenuSnapshot }) {
  const portrait = usePortrait();
  const items = productSections(menu).flatMap((section) =>
    section.items.filter((item) => item.available).map((item) => ({ ...item, kind: section.kind })),
  );
  const slides = flattenProductSlides(items);
  const heroSlides = flattenProductSlides(
    menu.heroes.map((hero) => ({
      id: hero.id,
      name: hero.caption || hero.badge || menu.brand.title,
      imageUrl: hero.imageUrl,
      imageUrls: hero.imageUrl ? [hero.imageUrl] : [],
    })),
  );
  const deck = slides.length ? slides : heroSlides;
  const index = useCycledIndex(Math.max(deck.length, 1));
  const current = deck[index] ?? null;
  const featuredItem = items.find((item) => item.id === current?.item.id) ?? null;
  const featuredHero = menu.heroes.find((hero) => hero.id === current?.item.id);
  const caption = featuredItem?.name ?? featuredHero?.caption ?? current?.item.name ?? menu.brand.title;
  const badge = featuredHero?.badge ?? menu.brand.ribbon;
  const imageUrl = current?.url ?? null;
  const tickerNames = items
    .filter((item) => item.id !== featuredItem?.id)
    .map((item) => item.name);
  const ticker = tickerNames.length ? [...tickerNames, ...tickerNames] : [];
  const fallbackPrice = featuredItem?.price ?? menu.priceTiers[0]?.price ?? null;
  const showPriceRail = !hasComponent(menu, "prices");
  const extraBlocks = menu.sections.filter(
    (section) => section.component === "prices" || section.component === "heroes",
  );

  return (
    <BoardFrame menu={menu}>
      <main
        className={`grid min-h-0 flex-1 overflow-hidden ${
          portrait ? "grid-rows-[minmax(0,1.4fr)_auto]" : "grid-cols-[1.35fr_0.65fr]"
        }`}
      >
        <section className="relative z-0 isolate overflow-hidden [clip-path:inset(0)] bg-[#2a1548]">
          {imageUrl ? (
            <div className="absolute inset-0">
              <ProductMedia
                urls={[imageUrl]}
                alt={caption}
                variant="promo"
                className="h-full w-full"
                sizes="1200px"
              />
            </div>
          ) : (
            <div className="grid h-full place-items-center bg-[#3b1d63]">
              <IceCreamCup
                scoopColors={
                  featuredHero?.variant === "fresa"
                    ? ["#ff4d6d", "#ff8a80"]
                    : ["#ffd54a", "#ffe082"]
                }
                size="lg"
                garnish={featuredHero?.variant ?? "none"}
              />
            </div>
          )}
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2a1548]/90 to-transparent ${
              portrait ? "px-8 pb-8 pt-20" : "px-12 pb-10 pt-28"
            }`}
          >
            {badge ? (
              <p className="mb-3 inline-flex rounded-full bg-[var(--micho-pink)] px-5 py-1.5 text-[18px] font-extrabold tracking-[0.16em] text-white">
                <CycleCopy>{badge}</CycleCopy>
              </p>
            ) : null}
            <h1
              className={`font-display leading-[0.9] text-white ${
                portrait ? "text-[64px]" : "text-[86px]"
              }`}
            >
              <CycleCopy>{caption}</CycleCopy>
            </h1>
            {featuredItem?.description ? (
              <p className="mt-3 max-w-[720px] text-[28px] font-bold text-white/90">
                <CycleCopy delay={80}>{featuredItem.description}</CycleCopy>
              </p>
            ) : (
              <p className="font-script mt-2 text-[42px] text-[var(--micho-gold)]">
                <CycleCopy delay={80}>{menu.brand.subtitle}</CycleCopy>
              </p>
            )}
            {fallbackPrice != null ? (
              <p className="mt-4 font-display text-[56px] leading-none text-[var(--micho-gold)]">
                {formatBoardPrice(fallbackPrice)}
              </p>
            ) : null}
          </div>
        </section>

        <aside
          className={`relative z-10 flex flex-col justify-center gap-5 bg-white ${
            portrait ? "px-8 py-6" : "px-8"
          }`}
        >
          <p className="font-display text-[42px] leading-none text-[var(--micho-pink)]">
            <CycleCopy>{menu.brand.title}</CycleCopy>
          </p>
          {showPriceRail ? <PricesStrip menu={menu} /> : null}
        </aside>
      </main>

      {extraBlocks.length ? (
        <div className={`shrink-0 ${portrait ? "h-[180px]" : "h-[220px]"}`}>
          <LayoutCanvas menu={{ ...menu, sections: extraBlocks }} />
        </div>
      ) : null}

      {ticker.length ? (
        <div className="relative z-20 h-[72px] shrink-0 overflow-hidden bg-[var(--micho-pink)]">
          <div className="promo-ticker-track">
            {ticker.map((name, tickerIndex) => (
              <span
                key={`${name}-${tickerIndex}`}
                className="inline-flex shrink-0 items-center whitespace-nowrap px-8 text-[28px] font-extrabold tracking-wide text-white"
              >
                {name}
                <span className="ml-8 text-[var(--micho-gold)]">•</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </BoardFrame>
  );
}
