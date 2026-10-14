import Image from "next/image";
import { MichoacanaLogo } from "@/components/display/MichoacanaLogo";
import { displayMediaUrl } from "@/lib/blob/display";
import type { MenuSnapshot } from "@/lib/menu/types";

export function BrandMark({
  menu,
  size = 148,
}: {
  menu: MenuSnapshot;
  size?: number;
}) {
  const logoUrl = displayMediaUrl(menu.brand.logoUrl);
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={menu.brand.title}
        width={size}
        height={size}
        className="object-contain"
        unoptimized
        priority
      />
    );
  }

  if (menu.store.slug === "la-michoacana") {
    return <MichoacanaLogo size={size} />;
  }

  const initial = (menu.brand.title.trim()[0] || menu.store.name[0] || "P").toUpperCase();
  return (
    <div
      className="grid place-items-center rounded-full text-white"
      style={{
        width: size,
        height: size,
        background: menu.theme.primary,
        fontSize: size * 0.42,
      }}
    >
      <span className="font-display leading-none">{initial}</span>
    </div>
  );
}
