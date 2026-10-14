"use client";

import {
  assignMediaToHero,
  assignMediaToItem,
  clearHeroMedia,
  deleteMediaAsset,
  recordUploadedAsset,
  updateMediaAlt,
} from "@/app/admin/media/actions";
import type { AdminCatalog } from "@/lib/menu/catalog";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  isAllowedImageType,
} from "@/lib/blob/rules";
import { uploadStoreMedia } from "@/lib/blob/upload-browser";
import { displayMediaUrl } from "@/lib/blob/display";
import { BusyOverlay } from "@/app/admin/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Aspect = "1:1" | "4:3";

async function cropCover(file: File, aspect: Aspect) {
  const bitmap = await createImageBitmap(file);
  const ratio = aspect === "1:1" ? 1 : 4 / 3;
  const width = 1600;
  const height = Math.round(width / ratio);
  const srcRatio = bitmap.width / bitmap.height;
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (srcRatio > ratio) {
    sw = bitmap.height * ratio;
    sx = (bitmap.width - sw) / 2;
  } else {
    sh = bitmap.width / ratio;
    sy = (bitmap.height - sh) / 2;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo recortar la imagen.");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("No se pudo recortar."))),
      "image/jpeg",
      0.88,
    );
  });
  return { blob, width, height };
}

function heroLabel(hero: AdminCatalog["heroes"][number], index: number) {
  return hero.caption || hero.badge || `Héroe ${index + 1}`;
}

export function MediaLibrary({
  catalog,
  blobConfigured,
}: {
  catalog: AdminCatalog;
  blobConfigured: boolean;
}) {
  const router = useRouter();
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, okText?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setMessage(result.error ?? "No se pudo guardar.");
        return;
      }
      setMessage(okText ?? null);
      router.refresh();
    });
  }

  async function onFiles(files: FileList | File[]) {
    if (!blobConfigured) {
      setMessage("Falta BLOB_READ_WRITE_TOKEN en el entorno.");
      return;
    }
    const list = Array.from(files);
    startTransition(async () => {
      for (const file of list) {
        if (!isAllowedImageType(file.type)) {
          setMessage("Solo JPEG, PNG o WebP (sin SVG).");
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setMessage("La foto no puede pesar más de 8 MB.");
          return;
        }
        try {
          setProgress(0);
          const cropped = await cropCover(file, aspect);
          setProgress(40);
          const uploaded = await uploadStoreMedia(
            cropped.blob,
            file.name.replace(/\.[^.]+$/, "") || "foto",
          );
          setProgress(85);
          const recorded = await recordUploadedAsset({
            url: uploaded.url,
            pathname: uploaded.pathname,
            mime: "image/jpeg",
            width: cropped.width,
            height: cropped.height,
            alt: file.name.replace(/\.[^.]+$/, ""),
          });
          if (!recorded.ok) {
            setMessage(recorded.error);
            setProgress(null);
            return;
          }
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "No se pudo subir.");
          setProgress(null);
          return;
        }
      }
      setProgress(null);
      setMessage("Foto guardada en la biblioteca.");
      router.refresh();
    });
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <BusyOverlay show={pending} cover="page" label={progress != null ? "Subiendo foto…" : "Guardando…"} />
      <header>
        <h1 className="text-2xl font-black text-zinc-900">Medios</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sube fotos para héroes y productos. Se recortan al centro en 1:1 o 4:3 para
          que no se deformen en 16:9 ni 9:16. Un producto puede tener varias fotos (carrusel).
        </p>
      </header>

      {message ? (
        <p className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-bold tracking-wide text-zinc-500">HÉROES EN LA TV</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {catalog.heroes.map((hero, index) => (
            <article key={hero.id} className="flex gap-3 rounded-xl border border-zinc-200 p-3">
              <div className="h-28 w-28 overflow-hidden rounded-lg bg-zinc-100">
                {hero.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayMediaUrl(hero.image_url)}
                    alt={heroLabel(hero, index)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <p className="grid h-full place-items-center px-2 text-center text-xs font-bold text-zinc-400">
                    Copa ilustrada
                  </p>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-zinc-900">{heroLabel(hero, index)}</p>
                <p className="text-xs text-zinc-500">{hero.variant ?? "cup"}</p>
                {hero.image_url ? (
                  <button
                    type="button"
                    disabled={pending}
                    className="mt-3 text-xs font-bold text-red-600"
                    onClick={() => run(() => clearHeroMedia(hero.id), "Héroe sin foto.")}
                  >
                    Quitar foto
                  </button>
                ) : (
                  <p className="mt-3 text-xs text-zinc-500">
                    Elige una foto abajo y pulsa «Usar aquí».
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold tracking-wide text-zinc-500">SUBIR</h2>
          <div className="flex gap-2 text-sm font-bold">
            {(["1:1", "4:3"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAspect(value)}
                className={`rounded-md px-3 py-1 ${
                  aspect === value ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <label
          className="mt-4 flex cursor-pointer flex-col items-center rounded-xl bg-zinc-50 px-4 py-10 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (event.dataTransfer.files.length) void onFiles(event.dataTransfer.files);
          }}
        >
          <span className="text-sm font-bold text-zinc-800">
            Arrastra una foto o haz clic para elegir
          </span>
          <span className="mt-1 text-xs text-zinc-500">
            JPEG, PNG o WebP · máximo 8 MB · recorte {aspect} al centro
          </span>
          <input
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            multiple
            className="sr-only"
            disabled={pending || !blobConfigured}
            onChange={(event) => {
              if (event.currentTarget.files?.length) {
                void onFiles(event.currentTarget.files);
                event.currentTarget.value = "";
              }
            }}
          />
        </label>
        {progress != null ? (
          <p className="mt-3 text-sm font-semibold text-zinc-700">Subiendo… {progress}%</p>
        ) : null}
        {!blobConfigured ? (
          <p className="mt-3 text-sm font-semibold text-amber-800">
            Configura BLOB_READ_WRITE_TOKEN para activar la subida.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold tracking-wide text-zinc-500">BIBLIOTECA</h2>
        {catalog.media.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay fotos.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.media.map((asset) => (
              <li key={asset.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="aspect-square bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayMediaUrl(asset.blob_url)}
                    alt={asset.alt ?? ""}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <input
                    defaultValue={asset.alt ?? ""}
                    placeholder="Texto alternativo"
                    maxLength={80}
                    className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                    onBlur={(event) => {
                      const alt = event.currentTarget.value.trim();
                      if (alt === (asset.alt ?? "")) return;
                      run(() => updateMediaAlt(asset.id, alt));
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {catalog.heroes.map((hero, index) => (
                      <button
                        key={hero.id}
                        type="button"
                        disabled={pending}
                        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
                        onClick={() =>
                          run(
                            () => assignMediaToHero(hero.id, asset.id),
                            `Asignada a ${heroLabel(hero, index)}. Publica el menú para verla en la TV.`,
                          )
                        }
                      >
                        Usar en {heroLabel(hero, index)}
                      </button>
                    ))}
                    <label className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-bold text-zinc-700">
                      Producto
                      <select
                        disabled={pending}
                        className="ml-1 bg-transparent"
                        defaultValue=""
                        onChange={(event) => {
                          const itemId = event.currentTarget.value;
                          event.currentTarget.value = "";
                          if (!itemId) return;
                          run(
                            () => assignMediaToItem(itemId, asset.id),
                            "Foto añadida al producto. Publica el menú para verla en la TV.",
                          );
                        }}
                      >
                        <option value="">Añadir a…</option>
                        {catalog.sections.flatMap((section) =>
                          section.items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          )),
                        )}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={pending}
                      className="ml-auto text-xs font-bold text-red-600"
                      onClick={() => run(() => deleteMediaAsset(asset.id), "Foto eliminada.")}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}