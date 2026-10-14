"use client";

import { saveBranding, setStoreLogo } from "@/app/admin/branding/actions";
import { recordUploadedAsset } from "@/app/admin/media/actions";
import { BusyOverlay } from "@/app/admin/ui";
import type { AdminCatalog } from "@/lib/menu/catalog";
import {
  ALLOWED_IMAGE_TYPES,
  isAllowedImageType,
  MAX_IMAGE_BYTES,
} from "@/lib/blob/rules";
import { COLOR_PALETTES, paletteForTheme } from "@/lib/menu/palettes";
import { uploadStoreMedia } from "@/lib/blob/upload-browser";
import { displayMediaUrl } from "@/lib/blob/display";
import {
  fieldClass,
  hydrateDirty,
  markDirty,
} from "@/lib/menu/form-draft";
import { useEffect, useState, useTransition } from "react";

export function BrandingStudio({
  catalog,
  blobConfigured,
}: {
  catalog: AdminCatalog;
  blobConfigured: boolean;
}) {
  const { branding, store } = catalog;
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [, setTick] = useState(0);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [primary, setPrimary] = useState(branding.theme.primary);
  const [secondary, setSecondary] = useState(branding.theme.secondary);
  const [footer, setFooter] = useState(branding.theme.footer);
  const [gold, setGold] = useState(branding.theme.gold);
  const [surface, setSurface] = useState(branding.theme.surface ?? "#ffffff");
  const [ink, setInk] = useState(branding.theme.ink ?? "#18181b");
  const canEdit = store.role !== "editor";
  const activePalette = paletteForTheme({
    primary,
    secondary,
    footer,
    gold,
    surface,
    ink,
  });

  useEffect(() => {
    hydrateDirty();
    setTick(1);
  }, []);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? okText : result.error ?? "No se pudo guardar.");
      if (result.ok) setTick((value) => value + 1);
    });
  }

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8">
      <BusyOverlay show={pending} cover="page" label="Guardando marca…" />
      <header>
        <h1 className="text-2xl font-black text-zinc-900">Marca</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Logo, colores y textos de la pantalla. Publica el menú para que la TV los muestre.
        </p>
      </header>

      {message ? (
        <p className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-bold tracking-wide text-zinc-500">LOGO</h2>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div
            className={fieldClass(
              "branding-logo",
              "grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-zinc-200",
            )}
            style={{ background: primary }}
          >
            {logoUrl ? (
              <img src={displayMediaUrl(logoUrl)} alt="" className="h-full w-full bg-white object-contain" />
            ) : (
              <span className="font-display text-4xl text-white">
                {(branding.title[0] || store.name[0] || "P").toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer rounded-lg bg-zinc-900 px-3 py-2 text-sm font-bold text-white">
              {pending ? "Subiendo…" : "Subir logo"}
              <input
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(",")}
                className="hidden"
                disabled={!canEdit || !blobConfigured || pending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (!blobConfigured) {
                    setMessage("Falta BLOB_READ_WRITE_TOKEN en el entorno.");
                    return;
                  }
                  if (!isAllowedImageType(file.type)) {
                    setMessage("Solo JPEG, PNG o WebP.");
                    return;
                  }
                  if (file.size > MAX_IMAGE_BYTES) {
                    setMessage("El logo no puede pesar más de 8 MB.");
                    return;
                  }
                  startTransition(async () => {
                    try {
                      const filename = `logo-${file.name.replace(/\.[^.]+$/, "")}`;
                      const uploaded = await uploadStoreMedia(file, filename);
                      const recorded = await recordUploadedAsset({
                        url: uploaded.url,
                        pathname: uploaded.pathname,
                        mime: uploaded.contentType,
                        alt: "Logo",
                      });
                      if (!recorded.ok) {
                        setMessage(recorded.error ?? "No se pudo subir.");
                        return;
                      }
                      const result = await setStoreLogo(uploaded.url);
                      if (result.ok) {
                        setLogoUrl(uploaded.url);
                        markDirty("branding-logo");
                        setTick((value) => value + 1);
                      }
                      setMessage(result.ok ? "Logo actualizado." : result.error);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "No se pudo subir.");
                    }
                  });
                }}
              />
            </label>
            {logoUrl ? (
              <button
                type="button"
                disabled={!canEdit || pending}
                className="text-left text-sm font-bold text-red-600"
                onClick={() =>
                  run(async () => {
                    const result = await setStoreLogo(null);
                    if (result.ok) {
                      setLogoUrl(null);
                      markDirty("branding-logo");
                    }
                    return result;
                  }, "Logo quitado.")
                }
              >
                Quitar logo
              </button>
            ) : null}
            {!blobConfigured ? (
              <p className="text-xs text-amber-700">Configura Blob para subir el logo.</p>
            ) : null}
          </div>
        </div>
      </section>

      <form
        className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const fields: Array<[string, string]> = [
            ["name", store.name],
            ["slug", store.slug],
            ["title", branding.title],
            ["tagline", branding.tagline],
            ["ribbon", branding.ribbon],
            ["closing", branding.closing],
            ["primary", branding.theme.primary],
            ["secondary", branding.theme.secondary],
            ["footer", branding.theme.footer],
            ["gold", branding.theme.gold],
            ["surface", branding.theme.surface ?? "#ffffff"],
            ["ink", branding.theme.ink ?? "#18181b"],
          ];
          run(async () => {
            const result = await saveBranding(form);
            if (result.ok) {
              for (const [name, original] of fields) {
                if (String(form.get(name) ?? "") !== original) markDirty(`branding-${name}`);
              }
            }
            return result;
          }, "Marca guardada. Publica para verla en la TV.");
        }}
      >
        <h2 className="text-sm font-bold tracking-wide text-zinc-500">NEGOCIO Y TEXTOS</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
            Nombre
            <input
              name="name"
              required
              defaultValue={store.name}
              disabled={!canEdit}
              className={fieldClass(
                "branding-name",
                "rounded-lg border border-zinc-300 px-3 py-2 font-medium text-zinc-900",
              )}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
            URL /v/
            <input
              name="slug"
              required
              defaultValue={store.slug}
              disabled={!canEdit}
              className={fieldClass(
                "branding-slug",
                "rounded-lg border border-zinc-300 px-3 py-2 font-medium text-zinc-900",
              )}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700 sm:col-span-2">
            Título en pantalla
            <input
              name="title"
              defaultValue={branding.title}
              disabled={!canEdit}
              className={fieldClass(
                "branding-title",
                "rounded-lg border border-zinc-300 px-3 py-2 font-medium text-zinc-900",
              )}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
            Subtítulo
            <input
              name="tagline"
              defaultValue={branding.tagline}
              disabled={!canEdit}
              className={fieldClass(
                "branding-tagline",
                "rounded-lg border border-zinc-300 px-3 py-2 font-medium text-zinc-900",
              )}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
            Cinta
            <input
              name="ribbon"
              defaultValue={branding.ribbon}
              disabled={!canEdit}
              className={fieldClass(
                "branding-ribbon",
                "rounded-lg border border-zinc-300 px-3 py-2 font-medium text-zinc-900",
              )}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700 sm:col-span-2">
            Cierre del pie
            <input
              name="closing"
              defaultValue={branding.closing}
              disabled={!canEdit}
              className={fieldClass(
                "branding-closing",
                "rounded-lg border border-zinc-300 px-3 py-2 font-medium text-zinc-900",
              )}
            />
          </label>
        </div>

        <h2 className="text-sm font-bold tracking-wide text-zinc-500">PALETAS</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          {COLOR_PALETTES.map((palette) => {
            const selected = activePalette?.key === palette.key;
            return (
              <button
                key={palette.key}
                type="button"
                disabled={!canEdit}
                onClick={() => {
                  setPrimary(palette.theme.primary);
                  setSecondary(palette.theme.secondary);
                  setFooter(palette.theme.footer);
                  setGold(palette.theme.gold);
                  setSurface(palette.theme.surface);
                  setInk(palette.theme.ink);
                }}
                className={`rounded-xl border p-3 text-left ${
                  selected ? "border-pink-500 bg-pink-50" : "border-zinc-200 bg-white"
                }`}
              >
                <span className="mb-2 flex h-8 overflow-hidden rounded-md">
                  <span className="flex-1" style={{ background: palette.theme.primary }} />
                  <span className="flex-1" style={{ background: palette.theme.secondary }} />
                  <span className="flex-1" style={{ background: palette.theme.footer }} />
                  <span className="flex-1" style={{ background: palette.theme.gold }} />
                </span>
                <p className="text-sm font-black text-zinc-900">{palette.name}</p>
                <p className="text-xs text-zinc-500">{palette.hint}</p>
              </button>
            );
          })}
        </div>

        <h2 className="text-sm font-bold tracking-wide text-zinc-500">COLORES</h2>
        <input type="hidden" name="surface" value={surface} />
        <input type="hidden" name="ink" value={ink} />
        <div className="grid gap-4 sm:grid-cols-4">
          <ColorField name="primary" label="Principal" value={primary} onChange={setPrimary} disabled={!canEdit} />
          <ColorField name="secondary" label="Secundario" value={secondary} onChange={setSecondary} disabled={!canEdit} />
          <ColorField name="footer" label="Pie" value={footer} onChange={setFooter} disabled={!canEdit} />
          <ColorField name="gold" label="Acento" value={gold} onChange={setGold} disabled={!canEdit} />
        </div>
        <div
          className="overflow-hidden rounded-2xl border border-zinc-200"
          style={{ background: footer }}
        >
          <div className="px-5 py-6" style={{ background: "#fff" }}>
            <p className="font-display text-4xl" style={{ color: primary }}>
              {branding.title || store.name}
            </p>
            <p className="font-script text-xl" style={{ color: secondary }}>
              {branding.tagline || "Subtítulo"}
            </p>
          </div>
          <p className="px-5 py-3 text-sm font-bold" style={{ color: gold }}>
            {branding.closing || "Pie de pantalla"}
          </p>
        </div>

        <button
          type="submit"
          disabled={!canEdit || pending}
          className="self-start rounded-lg bg-pink-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar marca"}
        </button>
      </form>
    </div>
  );
}

function ColorField({
  name,
  label,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-10 cursor-pointer rounded border border-zinc-300 bg-white"
        />
        <input
          name={name}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClass(
            `branding-${name}`,
            "min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 py-2 font-mono text-sm text-zinc-900",
          )}
        />
      </span>
    </label>
  );
}
