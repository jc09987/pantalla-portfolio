"use client";

import { PreviewFrame } from "@/app/admin/layout/PreviewFrame";
import { publishMenu, updateLayoutKey, updateOrientation } from "@/app/admin/actions";
import { SectionComposer } from "@/app/admin/SectionComposer";
import { TvPresence } from "@/app/admin/TvPresence";
import { BusyOverlay } from "@/app/admin/ui";
import type { AdminCatalog } from "@/lib/menu/catalog";
import {
  hasUnpublishedEdits,
  hydrateDirty,
  isDirty,
  markDirty,
  markPublished,
  overlayCatalog,
} from "@/lib/menu/form-draft";
import type { StageOrientation } from "@/lib/display/stage";
import { LAYOUTS, type LayoutKey } from "@/lib/menu/types";
import { useEffect, useRef, useState, useTransition } from "react";

export function LayoutStudio({ catalog }: { catalog: AdminCatalog }) {
  const view = overlayCatalog(catalog);
  const [layoutKey, setLayoutKey] = useState<LayoutKey>(catalog.menu.layout_key);
  const [liveKey, setLiveKey] = useState<LayoutKey>(catalog.menu.layout_key);
  const [orientation, setOrientation] = useState<StageOrientation>(
    catalog.menu.orientation ?? "landscape",
  );
  const [liveOrientation, setLiveOrientation] = useState<StageOrientation>(
    catalog.menu.orientation ?? "landscape",
  );
  const [previewNonce, setPreviewNonce] = useState(0);
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [sectionBusy, setSectionBusy] = useState(false);
  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutUnpublished = layoutKey !== liveKey || isDirty("layout");
  const orientationUnpublished =
    orientation !== liveOrientation || isDirty("orientation");
  const dirty = hasUnpublishedEdits(catalog) || layoutUnpublished || orientationUnpublished;
  const previewSrc = `${catalog.tvPath}?preview=1&layout=${layoutKey}&orient=${orientation}${
    previewNonce ? `&r=${previewNonce}` : ""
  }`;
  const embedSrc = `${previewSrc}&embed=1`;

  useEffect(() => {
    hydrateDirty();
    setTick(1);
  }, []);

  useEffect(() => {
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, []);

  function bump() {
    setTick((value) => value + 1);
  }

  function schedulePreview() {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      setPreviewNonce((value) => value + 1);
    }, 600);
  }

  function selectLayout(next: LayoutKey) {
    if (next === layoutKey && !saving) {
      setPreviewNonce((value) => value + 1);
      return;
    }
    const previous = layoutKey;
    setLayoutKey(next);
    startSave(async () => {
      const result = await updateLayoutKey(catalog.menu.id, next);
      if (!result.ok) {
        setLayoutKey(previous);
        setMessage(result.error);
        return;
      }
      markDirty("layout");
      bump();
      setMessage("Borrador actualizado. Publica para que la TV lo muestre.");
    });
  }

  function selectOrientation(next: StageOrientation) {
    if (next === orientation && !saving) {
      setPreviewNonce((value) => value + 1);
      return;
    }
    const previous = orientation;
    setOrientation(next);
    startSave(async () => {
      const result = await updateOrientation(catalog.menu.id, next);
      if (!result.ok) {
        setOrientation(previous);
        setMessage(result.error);
        return;
      }
      markDirty("orientation");
      bump();
      setMessage("Borrador actualizado. Publica para que la TV lo muestre.");
    });
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8" data-draft={tick}>
      <BusyOverlay
        show={publishing}
        cover="page"
        label="Publicando…"
      />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Diseño de pantalla</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Elige cómo se ve el menú en paisaje (16:9) o retrato (9:16). Cada 30 segundos las fotos y los textos entran y salen.
            La vista previa es el borrador; la TV no cambia hasta que publiques.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TvPresence slug={catalog.store.slug} />
          <a
            href={previewSrc}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-800"
          >
            Abrir borrador
          </a>
          <button
            type="button"
            disabled={publishing}
            onClick={() => {
              startPublish(async () => {
                const result = await publishMenu();
                if (!result.ok) {
                  setMessage(result.error ?? "No se pudo publicar.");
                  return;
                }
                markPublished();
                setLiveKey(layoutKey);
                setLiveOrientation(orientation);
                bump();
                setMessage("Diseño publicado en la TV.");
              });
            }}
            className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {publishing ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </header>

      {message ? (
        <p className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          {message}
        </p>
      ) : null}

      {dirty ? (
        <p className="text-sm font-semibold text-amber-800">
          Hay cambios sin publicar. La TV sigue en la última versión publicada.
        </p>
      ) : null}

      <section className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <BusyOverlay show={saving} label="Guardando diseño…" />
        {LAYOUTS.map((layout) => {
          const selected = layout.key === layoutKey;
          return (
            <button
              key={layout.key}
              type="button"
              disabled={saving}
              onClick={() => selectLayout(layout.key)}
              className={`rounded-2xl border px-4 py-4 text-left ${
                selected
                  ? `border-pink-500 bg-pink-50${layoutUnpublished ? " field-unpublished" : ""}`
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              } disabled:opacity-60`}
            >
              <p className="text-sm font-black text-zinc-900">{layout.name}</p>
              <p className="mt-1 text-sm text-zinc-600">{layout.hint}</p>
              {selected ? (
                <p className="mt-3 text-xs font-bold tracking-wide text-pink-600">
                  {saving ? "GUARDANDO…" : "BORRADOR ACTIVO"}
                </p>
              ) : null}
            </button>
          );
        })}
      </section>

      <SectionComposer
        menuId={catalog.menu.id}
        sections={view.sections}
        layoutSections={view.layoutSections}
        orientation={orientation}
        onError={setMessage}
        onBusy={setSectionBusy}
        onSaved={() => {
          bump();
          schedulePreview();
        }}
      />

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-bold tracking-wide text-zinc-500">
            VISTA PREVIA {orientation === "portrait" ? "9:16" : "16:9"}
          </h2>
          <div className="flex items-center gap-3">
            <div
              className={`flex rounded-lg border p-1 ${
                orientationUnpublished ? "field-unpublished border-pink-400" : "border-zinc-300"
              }`}
            >
              <button
                type="button"
                disabled={saving}
                onClick={() => selectOrientation("landscape")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  orientation === "landscape" ? "bg-zinc-900 text-white" : "text-zinc-600"
                }`}
              >
                Paisaje
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => selectOrientation("portrait")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  orientation === "portrait" ? "bg-zinc-900 text-white" : "text-zinc-600"
                }`}
              >
                Retrato
              </button>
            </div>
            <p className="text-xs font-semibold text-zinc-500">
              {sectionBusy ? "Actualizando secciones…" : "Borrador · no es la TV en vivo"}
            </p>
          </div>
        </div>
        <PreviewFrame key={orientation} src={embedSrc} orientation={orientation} />
      </section>
    </div>
  );
}
