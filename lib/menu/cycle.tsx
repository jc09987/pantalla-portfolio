"use client";

import { displayMediaUrl } from "@/lib/blob/display";
import { itemImageList } from "@/lib/menu/item-media";
import Image from "next/image";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export const BOARD_CYCLE_MS = 30_000;
export const BOARD_EXIT_MS = 640;
export const LIST_PAGE_MS = 5_000;
export const LIST_ROWS = 6;
export const LIST_ROW_PX = 36;
export const LIST_MAX_COLUMNS = 3;

type CycleState = {
  tick: number;
  phase: "in" | "out";
};

const CycleContext = createContext<CycleState>({ tick: 0, phase: "in" });

export function BoardCycle({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let exitTimer = 0;
    const beat = window.setInterval(() => {
      setPhase("out");
      exitTimer = window.setTimeout(() => {
        setTick((value) => value + 1);
        setPhase("in");
      }, BOARD_EXIT_MS);
    }, BOARD_CYCLE_MS);

    return () => {
      window.clearInterval(beat);
      window.clearTimeout(exitTimer);
    };
  }, []);

  return <CycleContext.Provider value={{ tick, phase }}>{children}</CycleContext.Provider>;
}

export function useBoardCycle() {
  return useContext(CycleContext);
}

export function useCycledIndex(length: number, offset = 0) {
  const { tick } = useBoardCycle();
  if (length <= 0) return 0;
  return (tick + offset) % length;
}

export function useCycledPage<T>(items: T[], pageSize: number) {
  const { tick, phase } = useBoardCycle();
  return paginateItems(items, pageSize, tick, phase);
}

export function useTimedCycledPage<T>(
  items: T[],
  pageSize: number,
  intervalMs = LIST_PAGE_MS,
) {
  const [tick, setTick] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / size));

  useEffect(() => {
    if (pageCount <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let exitTimer = 0;
    const beat = window.setInterval(() => {
      setPhase("out");
      exitTimer = window.setTimeout(() => {
        setTick((value) => value + 1);
        setPhase("in");
      }, BOARD_EXIT_MS);
    }, intervalMs);

    return () => {
      window.clearInterval(beat);
      window.clearTimeout(exitTimer);
    };
  }, [intervalMs, pageCount]);

  return paginateItems(items, pageSize, tick, phase);
}

function paginateItems<T>(
  items: T[],
  pageSize: number,
  tick: number,
  phase: "in" | "out",
) {
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = tick % pageCount;
  return {
    page,
    pageCount,
    phase,
    tick,
    items: items.slice(page * size, page * size + size),
  };
}

export function CycleCopy({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { tick, phase } = useBoardCycle();
  return (
    <span
      key={`${tick}-${phase}`}
      className={`cycle-copy cycle-copy-${phase} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}

export function ProductMedia({
  urls,
  alt,
  variant = "carousel",
  offset = 0,
  className = "",
  sizes,
}: {
  urls: string[];
  alt: string;
  variant?: "carousel" | "promo";
  offset?: number;
  className?: string;
  sizes?: string;
}) {
  const { tick, phase } = useBoardCycle();
  const resolved = urls.map((url) => displayMediaUrl(url)).filter(Boolean);
  const index = resolved.length ? (tick + offset) % resolved.length : 0;
  const src = resolved[index];

  if (!src) return null;

  return (
    <div className={`product-media product-media-${variant} ${className}`}>
      <div
        key={`${src}-${tick}-${phase}`}
        className={`product-media-frame cycle-media cycle-media-${phase}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className={variant === "promo" ? "object-cover anim-ken-burns" : "object-cover"}
          sizes={sizes ?? (variant === "promo" ? "100vw" : "280px")}
          unoptimized
        />
      </div>
      {resolved.length > 1 ? (
        <div className="product-media-dots" aria-hidden="true">
          {resolved.map((url, dot) => (
            <span
              key={url}
              className={dot === index ? "is-on" : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function productUrls(item: {
  imageUrl?: string | null;
  imageUrls?: string[] | null;
}) {
  return itemImageList(item);
}

export function flattenProductSlides<T extends {
  id: string;
  name: string;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
}>(items: T[]) {
  return items.flatMap((item, offset) => {
    const urls = itemImageList(item);
    if (!urls.length) {
      return [{ item, url: null as string | null, offset, key: `${item.id}-empty` }];
    }
    return urls.map((url, imageIndex) => ({
      item,
      url,
      offset,
      key: `${item.id}-${imageIndex}`,
    }));
  });
}

export function themeVars(theme: {
  primary: string;
  secondary: string;
  footer: string;
  gold: string;
  surface?: string;
  ink?: string;
}): CSSProperties {
  return {
    "--micho-pink": theme.primary,
    "--micho-blue": theme.secondary,
    "--micho-footer": theme.footer,
    "--micho-gold": theme.gold,
    "--micho-surface": theme.surface ?? "#ffffff",
    "--micho-ink": theme.ink ?? "#2a1548",
  } as CSSProperties;
}
