"use client";

import { IceCreamCup } from "@/components/display/IceCreamCup";
import { BrandMark } from "@/components/display/BrandMark";
import { ListHeaderGlyph } from "@/components/display/icons";
import { defaultListIcon } from "@/lib/menu/list-icons";
import { MilkSplash, WaterSplash } from "@/components/display/Splash";
import { displayMediaUrl } from "@/lib/blob/display";
import {
  CycleCopy,
  LIST_MAX_COLUMNS,
  LIST_ROW_PX,
  LIST_ROWS,
  ProductMedia,
  productUrls,
  useCycledPage,
  useTimedCycledPage,
} from "@/lib/menu/cycle";
import { usePortrait } from "@/lib/display/orientation";
import { formatBoardPrice } from "@/lib/menu/layouts/BoardFrame";
import { asSectionComponent, isProductComponent } from "@/lib/menu/sections";
import { componentsForSection, ensureLayoutPlan } from "@/lib/menu/layout-plan";
import type { MenuSnapshot } from "@/lib/menu/types";
import Image from "next/image";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type BoardTone = "classic" | "grid" | "cards" | "night" | "promo";

export function hasComponent(menu: MenuSnapshot, component: string) {
  return menu.sections.some((section) => asSectionComponent(section.component) === component);
}

export function productSections(menu: MenuSnapshot) {
  return menu.sections.filter((section) => isProductComponent(section.component));
}

export function BrandHeader({
  menu,
  showPrices = true,
  compact = false,
}: {
  menu: MenuSnapshot;
  showPrices?: boolean;
  compact?: boolean;
}) {
  const portrait = usePortrait();
  const tight = compact || portrait;

  return (
    <header
      className={`flex gap-5 px-8 ${
        portrait
          ? "flex-col items-stretch py-5"
          : `items-center ${tight ? "h-[140px] px-10" : "h-[168px] px-10 pt-4"}`
      }`}
    >
      <div className="flex min-w-0 items-center gap-5">
        <BrandMark menu={menu} size={tight ? 96 : 120} />
        <div className="min-w-0 flex-1">
          <h1
            className={`font-display leading-none tracking-wide text-[var(--micho-pink)] ${
              portrait ? "text-[48px]" : "text-[60px]"
            }`}
          >
            <CycleCopy>{menu.brand.title}</CycleCopy>
          </h1>
          <p
            className={`font-script leading-none text-[var(--micho-pink)] ${
              portrait ? "text-[24px]" : "text-[30px]"
            }`}
          >
            <CycleCopy delay={70}>{menu.brand.subtitle}</CycleCopy>
          </p>
        </div>
        {!portrait && showPrices ? <PricesStrip menu={menu} /> : null}
      </div>
      {portrait && showPrices ? <PricesStrip menu={menu} /> : null}
    </header>
  );
}

export function PricesStrip({ menu }: { menu: MenuSnapshot }) {
  const portrait = usePortrait();
  return (
    <div className={`flex shrink-0 gap-3 ${portrait ? "flex-wrap justify-center" : ""}`}>
      {menu.priceTiers.map((tier) => (
        <article
          key={tier.id}
          className="flex min-w-[132px] flex-col items-center rounded-[18px] border-[3px] border-[#6b3fa0] bg-white px-3 py-2"
        >
          <p className="text-[13px] font-extrabold tracking-widest text-[#5b2d82]">{tier.label}</p>
          <p className="font-display text-[28px] leading-none text-[var(--micho-pink)]">
            {formatBoardPrice(tier.price)}
          </p>
        </article>
      ))}
    </div>
  );
}

export function HeroesRail({
  menu,
  vertical,
}: {
  menu: MenuSnapshot;
  vertical?: boolean;
}) {
  const portrait = usePortrait();
  const column = vertical ?? !portrait;
  return (
    <aside
      className={`flex h-full min-h-0 py-2 ${
        column ? "flex-col justify-between" : "flex-row items-center justify-around"
      }`}
    >
      {menu.heroes.map((hero) => (
        <HeroCard key={hero.id} menu={menu} hero={hero} compact={!column} />
      ))}
    </aside>
  );
}

function HeroCard({
  menu,
  hero,
  compact = false,
}: {
  menu: MenuSnapshot;
  hero: MenuSnapshot["heroes"][number];
  compact?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center">
      <div className={hero.animation === "float" ? "anim-float" : ""}>
        {hero.imageUrl ? (
          <Image
            src={displayMediaUrl(hero.imageUrl)}
            alt={hero.caption ?? hero.badge ?? ""}
            width={compact ? 200 : 280}
            height={compact ? 200 : 280}
            className={compact ? "h-[200px] w-[180px] object-contain" : "h-[280px] w-[260px] object-contain"}
            unoptimized
          />
        ) : (
          <IceCreamCup
            scoopColors={
              hero.variant === "mango" ? ["#ffd54a", "#ffe082"] : ["#ff4d6d", "#ff8a80"]
            }
            size={compact ? "md" : "lg"}
            garnish={hero.variant}
          />
        )}
      </div>
      {hero.caption ? (
        <p className="font-script absolute right-[-8px] top-[42%] rotate-[-8deg] text-[28px] text-[#7a1848]">
          {hero.caption}
        </p>
      ) : null}
      {hero.badge ? (
        <div className="absolute bottom-6 right-[-12px] rounded-2xl bg-[var(--micho-pink)] px-4 py-2">
          <p className="text-[20px] font-black leading-none text-white">{hero.badge}</p>
        </div>
      ) : null}
    </div>
  );
}

function FitScale({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const fit = () => {
      const avail = outer.clientHeight;
      const need = inner.scrollHeight;
      const next = need > avail && avail > 0 ? avail / need : 1;
      setScale((prev) => (Math.abs(prev - next) < 0.005 ? prev : next));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="h-full min-h-0 w-full overflow-hidden">
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: scale < 1 ? `${100 / scale}%` : "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function columnize<T>(items: T[], columns: number) {
  const cols: T[][] = Array.from({ length: columns }, () => []);
  const size = Math.ceil(items.length / columns) || 1;
  items.forEach((item, index) => {
    const col = Math.min(Math.floor(index / size), columns - 1);
    cols[col].push(item);
  });
  return cols;
}

function ProductListPanel({
  section,
}: {
  section: MenuSnapshot["sections"][number];
}) {
  const portrait = usePortrait();
  const visible = section.items.filter((item) => item.available);
  const columns = Math.min(Math.max(section.columns || 1, 1), LIST_MAX_COLUMNS);
  const hasPrices = visible.some((item) => item.price != null);
  const stacked = !portrait && hasPrices;
  const displayColumns = stacked ? 1 : columns;
  const page = useTimedCycledPage(visible, displayColumns * LIST_ROWS);
  const cols = columnize(page.items, displayColumns);
  const isAgua = section.kind === "agua";
  const accent = isAgua ? "var(--micho-blue)" : "var(--micho-pink)";
  const headerIcon = section.headerIcon ?? defaultListIcon(section.kind);
  const rowPx = portrait || !stacked ? LIST_ROW_PX : 48;
  const wavePx = portrait ? 40 : 24;
  const showThumbs = portrait || !stacked;

  return (
    <section
      className="@container relative flex w-full min-h-0 flex-col overflow-hidden rounded-[24px] border-[4px] bg-[var(--micho-surface)]"
      style={{ borderColor: accent }}
    >
      <div
        className={`mt-2 flex min-w-0 items-center justify-center overflow-hidden rounded-full py-1.5 text-white ${
          stacked ? "mx-2 gap-1 px-2" : "mx-3 gap-2 px-3"
        }`}
        style={{ background: accent }}
      >
        <ListHeaderGlyph
          icon={headerIcon}
          className={`shrink-0 ${stacked ? "h-5 w-5" : "h-6 w-6"}`}
        />
        <h2
          className={`min-w-0 max-w-full text-center font-display tracking-wide ${
            stacked
              ? "line-clamp-2 text-[18px] leading-[0.95] [overflow-wrap:anywhere]"
              : columns <= 1
                ? "truncate text-[22px] leading-none"
                : "truncate text-[28px] leading-none"
          }`}
          style={
            portrait
              ? undefined
              : { fontSize: "clamp(15px, 10cqw, 28px)" }
          }
        >
          {section.name}
        </h2>
      </div>
      <div className="flex shrink-0 flex-col overflow-hidden">
        <div
          className={`relative z-10 grid overflow-hidden pt-1 transition-opacity duration-500 ${
            stacked ? "px-2" : "px-3"
          } ${page.phase === "out" ? "opacity-0" : "opacity-100"}`}
          style={{
            gridTemplateColumns: `repeat(${displayColumns}, minmax(0, 1fr))`,
            height: visible.length ? LIST_ROWS * rowPx : 0,
          }}
        >
          {cols.map((col, colIndex) => (
            <ul
              key={colIndex}
              className="grid w-full min-h-0 min-w-0 overflow-hidden"
              style={{ gridTemplateRows: `repeat(${LIST_ROWS}, ${rowPx}px)` }}
            >
              {col.slice(0, LIST_ROWS).map((item, itemIndex) => {
                const urls = productUrls(item);
                const priceLabel = item.price != null ? formatBoardPrice(item.price) : null;
                return (
                  <li
                    key={item.id}
                    className={`grid w-full min-w-0 items-center gap-x-2 overflow-hidden ${
                      priceLabel ? "grid-cols-[minmax(0,1fr)_max-content]" : "grid-cols-[minmax(0,1fr)]"
                    }`}
                    style={{ color: isAgua ? "#0177a8" : "var(--micho-pink)" }}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      {showThumbs && urls.length ? (
                        <div
                          className={`relative shrink-0 overflow-hidden rounded-md ${
                            portrait ? "h-8 w-8" : "h-6 w-6"
                          }`}
                        >
                          <ProductMedia
                            urls={urls}
                            alt={item.name}
                            offset={itemIndex + colIndex}
                            className="product-media-compact h-full w-full"
                            sizes="32px"
                          />
                        </div>
                      ) : (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                      )}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p
                          className={`font-extrabold ${
                            stacked
                              ? "line-clamp-2 text-[15px] leading-[1.1] [overflow-wrap:anywhere]"
                              : `truncate leading-none ${portrait ? "text-[17px]" : "text-[15px]"}`
                          }`}
                        >
                          {item.name}
                        </p>
                        {!stacked && item.description ? (
                          <p
                            className={`truncate font-semibold leading-none opacity-80 ${
                              portrait ? "text-[11px]" : "text-[10px]"
                            }`}
                          >
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {priceLabel ? (
                      <span
                        className={`whitespace-nowrap font-display leading-none tabular-nums ${
                          portrait ? "text-[17px]" : "text-[14px]"
                        }`}
                      >
                        {priceLabel}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
        <div
          className="pointer-events-none relative z-0 shrink-0 overflow-hidden anim-splash"
          style={{ height: wavePx }}
        >
          {isAgua ? <WaterSplash className="h-full w-full" /> : <MilkSplash className="h-full w-full" />}
        </div>
      </div>
    </section>
  );
}

function CarouselPanel({
  section,
  menu,
}: {
  section: MenuSnapshot["sections"][number];
  menu: MenuSnapshot;
}) {
  const fallback = menu.priceTiers[0]?.price ?? null;
  const tiles = section.items.filter((item) => item.available);
  const page = useCycledPage(tiles, 8);
  const columns = page.items.length <= 4 ? 2 : 4;
  const accent = section.kind === "agua" ? "var(--micho-blue)" : "var(--micho-pink)";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border-[3px]" style={{ borderColor: accent }}>
      <h2 className="px-5 py-3 font-display text-[32px] text-white" style={{ background: accent }}>
        {section.name}
      </h2>
      <div
        className="grid min-h-0 flex-1 gap-3 p-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {page.items.map((item, index) => {
          const urls = productUrls(item);
          const price = item.price ?? fallback;
          return (
            <article key={`${item.id}-${page.page}`} className="relative overflow-hidden rounded-[20px] bg-[#fff4fb]">
              {urls.length ? (
                <ProductMedia
                  urls={urls}
                  alt={item.name}
                  variant="promo"
                  offset={index}
                  className="h-full min-h-[140px] w-full"
                  sizes="320px"
                />
              ) : (
                <div className="grid h-full min-h-[140px] place-items-center">
                  <IceCreamCup scoopColors={["#ff6ba8", "#ffd54a"]} size="sm" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-white">
                <p className="truncate font-display text-[24px] leading-none">
                  <CycleCopy delay={index * 40}>{item.name}</CycleCopy>
                </p>
                {item.description ? (
                  <p className="truncate text-[14px] font-semibold text-white/85">{item.description}</p>
                ) : null}
                {price != null ? (
                  <p className="font-display text-[22px] text-[var(--micho-gold)]">
                    {formatBoardPrice(price)}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PromoPanel({
  section,
  menu,
  rows = 3,
}: {
  section: MenuSnapshot["sections"][number];
  menu: MenuSnapshot;
  rows?: number;
}) {
  const portrait = usePortrait();
  const items = section.items.filter((item) => item.available);
  const page = useCycledPage(items, rows);
  const compact = rows === 1;

  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_1fr] overflow-hidden">
      <h2
        className={`px-1 font-display leading-none text-[var(--micho-pink)] ${
          compact ? "pb-1 text-[22px]" : portrait ? "pb-2 text-[28px]" : "pb-2 text-[36px]"
        }`}
      >
        {section.name}
      </h2>
      <div
        className="grid min-h-0 gap-3"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {page.items.length ? (
          page.items.map((item, index) => (
            <PromoStripe
              key={`${item.id}-${page.page}`}
              item={item}
              menu={menu}
              index={index}
              compact={compact}
            />
          ))
        ) : (
          <article className="relative min-h-0 overflow-hidden rounded-[24px] bg-[#2a1548]">
            <div className="absolute inset-0 grid place-items-center bg-[#3b1d63]">
              <IceCreamCup scoopColors={["#ff6ba8", "#ffd54a"]} size={portrait ? "sm" : "md"} />
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

export function PromoStripe({
  item,
  menu,
  index = 0,
  compact = false,
}: {
  item: MenuSnapshot["sections"][number]["items"][number];
  menu: MenuSnapshot;
  index?: number;
  compact?: boolean;
}) {
  const fallback = menu.priceTiers[0]?.price ?? null;
  const urls = productUrls(item);
  const price = item.price ?? fallback;

  return (
    <article className="relative min-h-0 overflow-hidden rounded-[24px] bg-[#2a1548]">
      {urls.length ? (
        <div className="absolute inset-0">
          <ProductMedia
            urls={urls}
            alt={item.name}
            variant="promo"
            offset={index}
            className="h-full w-full"
            sizes="1200px"
          />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[#3b1d63]">
          <IceCreamCup scoopColors={["#ff6ba8", "#ffd54a"]} size="md" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
      <div
        className={`relative z-10 flex h-full items-end justify-between ${
          compact ? "px-5 pb-4" : "px-8 pb-6"
        }`}
      >
        <div>
          <p
            className={`font-display leading-none text-white ${
              compact ? "text-[36px]" : "text-[48px]"
            }`}
          >
            <CycleCopy delay={index * 60}>{item.name}</CycleCopy>
          </p>
          {item.description ? (
            <p
              className={`mt-1 max-w-[720px] font-bold text-white/85 ${
                compact ? "text-[16px]" : "text-[20px]"
              }`}
            >
              <CycleCopy delay={index * 60 + 40}>{item.description}</CycleCopy>
            </p>
          ) : null}
        </div>
        {price != null ? (
          <p
            className={`font-display text-[var(--micho-gold)] ${
              compact ? "text-[36px]" : "text-[44px]"
            }`}
          >
            {formatBoardPrice(price)}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function PricesPanel({ menu, title }: { menu: MenuSnapshot; title: string }) {
  return (
    <section className="flex h-full min-h-0 flex-col items-center justify-center gap-5 rounded-[28px] border-[4px] border-[#6b3fa0] bg-white px-6">
      <h2 className="font-display text-[36px] text-[var(--micho-pink)]">{title}</h2>
      <div className="flex flex-wrap justify-center gap-4">
        {menu.priceTiers.map((tier, index) => (
          <article
            key={tier.id}
            className="flex min-w-[160px] flex-col items-center rounded-[22px] border-[3px] border-[#6b3fa0] px-4 py-4"
          >
            {tier.scoopColors.length ? (
              <div className={tier.animation === "float" ? "anim-float" : ""}>
                <IceCreamCup scoopColors={tier.scoopColors} size="sm" />
              </div>
            ) : null}
            <p className="mt-1 text-[15px] font-extrabold tracking-widest text-[#5b2d82]">{tier.label}</p>
            <p className="font-display text-[36px] leading-none text-[var(--micho-pink)]">
              <CycleCopy delay={index * 50}>{formatBoardPrice(tier.price)}</CycleCopy>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HeroesPanel({ menu, title }: { menu: MenuSnapshot; title: string }) {
  const portrait = usePortrait();
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border-[4px] border-[var(--micho-pink)]">
      <h2 className="bg-[var(--micho-pink)] px-5 py-3 font-display text-[32px] text-white">{title}</h2>
      <div
        className={`grid min-h-0 flex-1 gap-3 p-4 ${
          portrait ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {menu.heroes.map((hero) => (
          <HeroCard key={hero.id} menu={menu} hero={hero} compact={portrait} />
        ))}
      </div>
    </section>
  );
}

export function BoardSection({
  menu,
  section,
  promoRows = 3,
}: {
  menu: MenuSnapshot;
  section: MenuSnapshot["sections"][number];
  promoRows?: number;
}) {
  const component = asSectionComponent(section.component);
  if (component === "prices") return <PricesPanel menu={menu} title={section.name} />;
  if (component === "heroes") return <HeroesPanel menu={menu} title={section.name} />;
  if (component === "carousel") return <CarouselPanel menu={menu} section={section} />;
  if (component === "promo") return <PromoPanel menu={menu} section={section} rows={promoRows} />;
  return <ProductListPanel section={section} />;
}

const LANDSCAPE_COMPONENTS_PER_ROW = 2;

function landscapeWeight(section: MenuSnapshot["sections"][number]) {
  const component = asSectionComponent(section.component);
  if (component === "prices" || component === "heroes") return LIST_MAX_COLUMNS;
  return Math.min(Math.max(section.columns || 1, 1), LIST_MAX_COLUMNS);
}

function landscapeRowTemplate(row: MenuSnapshot["sections"]) {
  return row.map((section) => `minmax(0, ${landscapeWeight(section)}fr)`).join(" ");
}

function isProductList(section: MenuSnapshot["sections"][number]) {
  return asSectionComponent(section.component) === "products";
}

function spansFullWidth(section: MenuSnapshot["sections"][number]) {
  const component = asSectionComponent(section.component);
  return component === "promo" || component === "prices" || component === "heroes" || component === "carousel";
}

function packLandscapeRows(blocks: MenuSnapshot["sections"]) {
  const rows: MenuSnapshot["sections"][] = [];
  let current: MenuSnapshot["sections"] = [];
  const flush = () => {
    if (!current.length) return;
    rows.push(current);
    current = [];
  };
  for (const block of blocks) {
    if (spansFullWidth(block)) {
      flush();
      rows.push([block]);
      continue;
    }
    current.push(block);
    if (current.length === LANDSCAPE_COMPONENTS_PER_ROW) flush();
  }
  flush();
  return rows.length ? rows : [[]];
}

function LandscapeBand({
  menu,
  band,
  promoRows,
  spanByColumns = false,
}: {
  menu: MenuSnapshot;
  band: NonNullable<MenuSnapshot["layoutSections"]>[number];
  promoRows?: number;
  spanByColumns?: boolean;
}) {
  const blocks = componentsForSection(menu.sections, band);
  const rows = packLandscapeRows(blocks);
  const sized =
    blocks.length > 0 &&
    blocks.every((section) => isProductList(section) || asSectionComponent(section.component) === "promo");

  if (!spanByColumns && !blocks.some(spansFullWidth)) {
    const columns = Math.min(LANDSCAPE_COMPONENTS_PER_ROW, Math.max(blocks.length, 1));
    const rowCount = Math.max(Math.ceil(blocks.length / columns), 1);
    return (
      <div
        className={`grid h-full min-h-0 min-w-0 gap-3 overflow-hidden ${sized ? "content-between" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: sized
            ? `repeat(${rowCount}, max-content)`
            : `repeat(${rowCount}, minmax(0, 1fr))`,
        }}
      >
        {blocks.map((section) => (
          <BandCell key={section.id} section={section}>
            <BoardSection menu={menu} section={section} promoRows={promoRows} />
          </BandCell>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid h-full min-h-0 min-w-0 gap-3 overflow-hidden ${sized ? "content-between" : ""}`}
      style={{
        gridTemplateRows: sized
          ? `repeat(${rows.length}, max-content)`
          : `repeat(${rows.length}, minmax(0, 1fr))`,
      }}
    >
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid min-h-0 min-w-0 items-start gap-3"
          style={{
            gridTemplateColumns: row.length ? landscapeRowTemplate(row) : "minmax(0, 1fr)",
            gridTemplateRows: "max-content",
          }}
        >
          {row.map((section) => (
            <BandCell key={section.id} section={section}>
              <BoardSection menu={menu} section={section} promoRows={promoRows} />
            </BandCell>
          ))}
        </div>
      ))}
    </div>
  );
}

const PROMO_BAND_PX = 148;

function BandCell({
  section,
  children,
}: {
  section: MenuSnapshot["sections"][number];
  children: ReactNode;
}) {
  if (isProductList(section)) {
    return <div className="min-w-0 self-start">{children}</div>;
  }
  if (asSectionComponent(section.component) === "promo") {
    return (
      <div className="min-w-0 overflow-hidden" style={{ height: PROMO_BAND_PX }}>
        {children}
      </div>
    );
  }
  return <div className="h-full min-h-0 min-w-0 overflow-hidden [&>*]:h-full">{children}</div>;
}

export function LayoutCanvas({
  menu,
  showHeroRail = false,
}: {
  menu: MenuSnapshot;
  showHeroRail?: boolean;
}) {
  const portrait = usePortrait();
  const bands = ensureLayoutPlan(
    menu.sections.map((section) => section.id),
    menu.layoutSections,
  );
  const trackCount = Math.max(bands.length, 1);

  return (
    <main
      className={`grid min-h-0 flex-1 gap-4 overflow-hidden pb-4 ${portrait ? "px-6" : "px-10"}`}
      style={{
        gridTemplateColumns: portrait
          ? showHeroRail
            ? "340px minmax(0, 1fr)"
            : "minmax(0, 1fr)"
          : showHeroRail
            ? `340px repeat(${trackCount}, minmax(0, 1fr))`
            : `repeat(${trackCount}, minmax(0, 1fr))`,
        gridTemplateRows: portrait ? `repeat(${trackCount}, minmax(0, 1fr))` : "minmax(0, 1fr)",
      }}
    >
      {showHeroRail ? (
        <div className="min-h-0 min-w-0 overflow-hidden" style={portrait ? { gridRow: "1 / -1" } : undefined}>
          <HeroesRail menu={menu} />
        </div>
      ) : null}
      {bands.map((band) => {
        if (!portrait) {
          return <LandscapeBand key={band.id} menu={menu} band={band} />;
        }
        const blocks = componentsForSection(menu.sections, band);
        return (
          <div key={band.id} className="grid min-h-0 min-w-0 grid-cols-3 gap-3 overflow-hidden">
            {blocks.map((section) => {
              const component = asSectionComponent(section.component);
              const span =
                component === "promo" || component === "prices" || component === "heroes"
                  ? 3
                  : Math.min(Math.max(section.columns || 1, 1), 3);
              return (
                <div
                  key={section.id}
                  className="min-h-0 min-w-0 overflow-hidden"
                  style={{ gridColumn: `span ${span}` }}
                >
                  <BoardSection menu={menu} section={section} />
                </div>
              );
            })}
          </div>
        );
      })}
    </main>
  );
}

export function ClassicLayoutCanvas({
  menu,
  showHeroRail = false,
}: {
  menu: MenuSnapshot;
  showHeroRail?: boolean;
}) {
  const portrait = usePortrait();
  const bands = ensureLayoutPlan(
    menu.sections.map((section) => section.id),
    menu.layoutSections,
  );
  const showSide = showHeroRail && !hasComponent(menu, "heroes");
  const listTracks = 3;
  const trackCount = Math.max(bands.length, 1);

  if (!portrait) {
    return (
      <main
        className="grid min-h-0 flex-1 gap-3 overflow-hidden px-10 pb-3"
        style={{
          gridTemplateColumns: showSide
            ? `340px repeat(${trackCount}, minmax(0, 1fr))`
            : `repeat(${trackCount}, minmax(0, 1fr))`,
          gridTemplateRows: "minmax(0, 1fr)",
        }}
      >
        {showSide ? (
          <div className="min-h-0 min-w-0 overflow-hidden">
            <HeroesRail menu={menu} vertical />
          </div>
        ) : null}
        {bands.map((band) => (
          <div key={band.id} className="min-h-0 min-w-0 overflow-hidden">
            <LandscapeBand menu={menu} band={band} promoRows={1} spanByColumns />
          </div>
        ))}
      </main>
    );
  }

  return (
    <main
      className="grid min-h-0 flex-1 gap-3 overflow-hidden px-6 pb-3"
      style={{
        gridTemplateColumns: showSide ? "300px minmax(0, 1fr)" : "minmax(0, 1fr)",
        gridTemplateRows: "minmax(0, 1fr)",
      }}
    >
      {showSide ? (
        <div className="flex min-h-0 flex-col overflow-hidden">
          <HeroesRail menu={menu} vertical />
        </div>
      ) : null}
      <FitScale>
        <div className="flex min-h-0 flex-col gap-3">
          {bands.map((band) => {
            const blocks = componentsForSection(menu.sections, band);
            return (
              <div
                key={band.id}
                className="grid min-h-0 gap-3"
                style={{
                  gridTemplateColumns: `repeat(${listTracks}, minmax(0, 1fr))`,
                  gridAutoRows: "max-content",
                }}
              >
                {blocks.map((section) => {
                  const component = asSectionComponent(section.component);
                  const full =
                    component === "promo" ||
                    component === "prices" ||
                    component === "heroes";
                  const span = full
                    ? listTracks
                    : Math.min(Math.max(section.columns || 1, 1), listTracks);
                  return (
                    <div
                      key={section.id}
                      className={
                        component === "promo"
                          ? "h-[200px] min-h-[160px] overflow-hidden"
                          : "min-h-0 overflow-hidden"
                      }
                      style={{ gridColumn: `span ${span}` }}
                    >
                      <BoardSection menu={menu} section={section} promoRows={1} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </FitScale>
    </main>
  );
}
