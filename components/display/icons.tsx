import type { ListIcon } from "@/lib/menu/list-icons";
import type { FeatureIcon } from "@/lib/menu/types";

export function WaterDropIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M16 3 C16 3 6 16 6 22 a10 10 0 0 0 20 0 C26 16 16 3 16 3 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MilkBottleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M12 4 h8 v3 l2 3 v18 a4 4 0 0 1 -4 4 h-4 a4 4 0 0 1 -4 -4 V10 l2 -3 z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ListHeaderGlyph({
  icon,
  className = "h-6 w-6 shrink-0",
}: {
  icon: ListIcon;
  className?: string;
}) {
  if (icon === "water") return <WaterDropIcon className={className} />;
  if (icon === "milk") return <MilkBottleIcon className={className} />;
  const d = LIST_ICON_PATHS[icon];
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

const LIST_ICON_PATHS: Record<Exclude<ListIcon, "water" | "milk">, string> = {
  "ice-cream":
    "M16 3a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.8V27a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V15.8A7 7 0 0 0 23 10a7 7 0 0 0-7-7zm-2 24v-8h4v8a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z",
  coffee:
    "M6 10h16v8a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6zm16 2h2.5A3.5 3.5 0 0 1 28 15.5 3.5 3.5 0 0 1 24.5 19H22zM8 26h14v2H8z",
  soda: "M12 4h8l1 4H11zm-1 6h10l2 18H9zm5 3v12h2V13z",
  burger:
    "M6 14h20c0-4.4-4.5-8-10-8S6 9.6 6 14zm-1 2v3h22v-3zm1 5v2c0 2 2 4 10 4s10-2 10-4v-2H6z",
  pizza:
    "M16 4c8 0 12 4 12 4L16 28 4 8s4-4 12-4zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM11 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  taco: "M4 18c0-7 5.4-12 12-12s12 5 12 12v2c0 2-2 4-4 4H8c-2 0-4-2-4-4zm4-2h16c0-4.4-3.6-8-8-8s-8 3.6-8 8z",
  salad:
    "M16 6c2 0 4 2 4 4 3 0 5 2 5 5 0 .7-.1 1.3-.4 1.9C27 18 29 20 29 23c0 3-6 5-13 5S3 26 3 23c0-3 2-5 4.4-6.1A5 5 0 0 1 7 15c0-3 2-5 5-5 0-2 2-4 4-4z",
  fruit:
    "M18 6c2-3 6-2 6 1-4 1-6 3-6 3zm-2 2c7 0 12 5 12 11 0 6-5 9-12 9S4 25 4 19C4 13 9 8 16 8z",
  cake: "M10 6a3 3 0 0 1 6 0v2h-6zm8 0a3 3 0 0 1 6 0v2h-6zM6 10h20v6H6zm0 8h20v8H6z",
  bread:
    "M6 14c0-5 4-8 10-8s10 3 10 8v10a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z",
  chicken:
    "M7 18c0-6 5-10 11-10 2 0 4 .6 5.5 1.7L28 8l-1 6c1 1.5 1.5 3.3 1.5 5 0 5-4 9-10 9-4 0-7-2-8.7-4.5L6 26l1-8z",
  fish: "M3 16c8-8 14-6 20-4 0 0 2-4 6-5-1 4-2 7-2 9s1 5 2 9c-4-1-6-5-6-5-6 2-12 4-20-4z",
  soup: "M6 14h20a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8zm4-4c0-2 2-4 6-4s6 2 6 4zM8 24h16v2H8z",
  wine: "M10 4h12l-2 10a6 6 0 1 1-8 0zm5 12v10H11v2h10v-2h-4V16z",
  beer: "M8 8h12v2l1 2v14a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V12l1-2zm12 4h3a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-3z",
  utensils:
    "M8 4v10a2 2 0 0 0 2 2v12h2V16a2 2 0 0 0 2-2V4h-2v8h-2V4zm14 0c-2 4-2 8 0 12v12h2V4z",
  chef: "M8 12a8 8 0 1 1 16 0v2H8zm2 4h12v2l-1 10H11z",
  snack:
    "M7 20c2 6 16 6 18 0 1-4-2-8-6-10 2 3 2 6 0 8-3-4-8-4-12 0-1-3 0-6 2-8-4 2-7 6-6 10z",
  sandwich:
    "M5 12h22l-2 4H7zm2 6h18v3H7zm-1 5h20l-2 4H8z",
  noodles:
    "M6 10h20v2c-3 2-6 3-10 3s-7-1-10-3zm2 7h16c0 6-3 9-8 9s-8-3-8-9z",
  egg: "M16 4c6 0 10 7 10 14s-4 10-10 10S6 25 6 18 10 4 16 4z",
  cheese:
    "M4 14 L28 10 v14 H4zm6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
};

export function FeatureGlyph({ icon }: { icon: FeatureIcon }) {
  const className = "h-9 w-9 shrink-0";
  if (icon === "leaf") {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
        <path d="M6 26 C18 24 26 14 27 5 C12 7 5 16 6 26 Z" fill="#7ed957" />
        <path d="M10 22 C16 16 22 10 26 6" stroke="#2e7d32" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (icon === "fruit") {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
        <circle cx="13" cy="18" r="8" fill="#ff7043" />
        <circle cx="21" cy="16" r="7" fill="#ffca28" />
        <path d="M18 8 C20 4 24 6 22 10" fill="#43a047" />
      </svg>
    );
  }
  if (icon === "heart") {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
        <path
          d="M16 27 C8 21 4 16 4 11 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 c0 5 -4 10 -12 16 Z"
          fill="#ff5fa2"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="4" fill="#90caf9" />
      <g stroke="#90caf9" strokeWidth="2" strokeLinecap="round">
        <path d="M16 5 v5 M16 22 v5 M5 16 h5 M22 16 h5 M8 8 l3.5 3.5 M20.5 20.5 L24 24 M24 8 l-3.5 3.5 M8 24 l3.5 -3.5" />
      </g>
    </svg>
  );
}
