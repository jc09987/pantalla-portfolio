import { TvBoard } from "@/components/display/TvBoard";
import { getDraftMenuForViewer } from "@/lib/menu/catalog";
import { asStageOrientation, parseOrientation } from "@/lib/display/stage";
import { getPublishedMenu } from "@/lib/menu/snapshot";
import { isLayoutKey } from "@/lib/menu/types";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function isPreviewFlag(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "true";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; layout?: string; orient?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  if (isPreviewFlag(query.preview)) {
    const draft = await getDraftMenuForViewer(slug);
    if (draft.ok) {
      return {
        title: `${draft.snapshot.brand.title} · Borrador`,
        description: draft.snapshot.brand.subtitle,
        robots: { index: false, follow: false },
      };
    }
  }
  const menu = await getPublishedMenu(slug);
  if (!menu) return { title: "Menú" };
  return {
    title: `${menu.brand.title} · Pantalla`,
    description: menu.brand.subtitle,
  };
}

export default async function TvMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; layout?: string; orient?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  if (isPreviewFlag(query.preview)) {
    const draft = await getDraftMenuForViewer(slug);
    if (draft.error === "unauthenticated") {
      redirect(`/admin/login?next=${encodeURIComponent(`/v/${slug}?preview=1`)}`);
    }
    if (!draft.ok) notFound();

    const snapshot = {
      ...draft.snapshot,
      layoutKey:
        query.layout && isLayoutKey(query.layout)
          ? query.layout
          : draft.snapshot.layoutKey,
      orientation:
        parseOrientation(query.orient) ??
        asStageOrientation(draft.snapshot.orientation),
    };

    return <TvBoard slug={slug} snapshot={snapshot} live={false} kiosk={false} />;
  }

  const menu = await getPublishedMenu(slug);
  if (!menu) notFound();

  return <TvBoard slug={slug} snapshot={menu} live />;
}
