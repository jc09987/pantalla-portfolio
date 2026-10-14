"use client";

import {
  addHero,
  addMenuItem,
  addPriceTier,
  deleteHero,
  deleteMenuItem,
  deletePriceTier,
  publishMenu,
  updateHero,
  updateMenuItem,
  updateTierLabel,
  updateTierPrice,
} from "@/app/admin/actions";
import { assignMediaToItem, removeItemMedia } from "@/app/admin/media/actions";
import { SectionComposer } from "@/app/admin/SectionComposer";
import { TvPresence } from "@/app/admin/TvPresence";
import { BusyOverlay } from "@/app/admin/ui";
import type { AdminCatalog, AdminHero, AdminItem, AdminMedia, AdminSection, AdminTier } from "@/lib/menu/catalog";
import {
  fieldClass,
  formatMoney,
  hasUnpublishedEdits,
  hydrateDirty,
  markDirty,
  markPublished,
  overlayAvailable,
  overlayCatalog,
  overlayDescription,
  overlayItemPriceText,
  overlayName,
  overlayPriceText,
  parseMoney,
  parseOptionalMoney,
  rememberAddedItem,
  rememberAvailable,
  rememberDescription,
  rememberItemPrice,
  rememberName,
  rememberPrice,
  rememberRemovedItem,
} from "@/lib/menu/form-draft";
import { displayMediaUrl } from "@/lib/blob/display";
import { asSectionComponent, isProductComponent, labelForComponent } from "@/lib/menu/sections";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function MenuEditor({ catalog }: { catalog: AdminCatalog }) {
  const view = overlayCatalog(catalog);
  const [message, setMessage] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [publishing, startPublish] = useTransition();
  const dirty = hasUnpublishedEdits(catalog);

  useEffect(() => {
    hydrateDirty();
    setTick(1);
  }, []);

  function bump() {
    setTick((value) => value + 1);
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <BusyOverlay show={publishing} cover="page" label="Publicando…" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">{catalog.store.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {dirty
              ? "Hay cambios sin publicar. La TV sigue mostrando la última versión publicada."
              : "La pantalla está al día con este menú."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TvPresence slug={catalog.store.slug} />
          <a
            href={catalog.tvPath}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-800"
          >
            Ver pantalla
          </a>
          <a
            href="/admin/layout"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-800"
          >
            Diseño
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
                bump();
                setMessage("Menú publicado en la TV.");
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

      <SectionComposer
        menuId={catalog.menu.id}
        sections={view.sections}
        layoutSections={view.layoutSections}
        orientation={catalog.menu.orientation}
        onError={setMessage}
        onSaved={bump}
      />

      {!view.sections.some((section) => asSectionComponent(section.component) === "prices") ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-black text-zinc-900">Precios</h2>
          <p className="mb-3 text-sm text-zinc-600">
            Se muestran en el encabezado hasta que agregues una sección Precios.
          </p>
          <PricesEditor
            menuId={catalog.menu.id}
            tiers={view.tiers}
            onError={setMessage}
            onSaved={bump}
          />
        </section>
      ) : null}

      {!view.sections.some((section) => asSectionComponent(section.component) === "heroes") ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-black text-zinc-900">Destacados</h2>
          <p className="mb-3 text-sm text-zinc-600">
            Se muestran al costado hasta que agregues una sección Destacados.
          </p>
          <HeroesEditor
            menuId={catalog.menu.id}
            heroes={catalog.heroes}
            onError={setMessage}
            onSaved={bump}
          />
        </section>
      ) : null}

      {view.sections.map((section) => (
        <SectionCard
          key={section.id}
          catalog={catalog}
          section={section}
          tiers={view.tiers}
          onError={setMessage}
          onSaved={bump}
        />
      ))}
    </div>
  );
}

function SectionCard({
  catalog,
  section,
  tiers,
  onError,
  onSaved,
}: {
  catalog: AdminCatalog;
  section: AdminSection;
  tiers: AdminTier[];
  onError: (error: string) => void;
  onSaved: () => void;
}) {
  const component = asSectionComponent(section.component);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold tracking-wide text-zinc-500">
          {labelForComponent(component)}
        </span>
        <h2 className="text-lg font-black text-zinc-900">{section.name}</h2>
      </div>
      {component === "prices" ? (
        <PricesEditor
          menuId={catalog.menu.id}
          tiers={tiers}
          onError={onError}
          onSaved={onSaved}
        />
      ) : null}
      {component === "heroes" ? (
        <HeroesEditor
          menuId={catalog.menu.id}
          heroes={catalog.heroes}
          onError={onError}
          onSaved={onSaved}
        />
      ) : null}
      {isProductComponent(component) ? (
        <>
          <ul className="flex flex-col gap-2">
            {section.items.map((item) => (
              <FlavorRow
                key={item.id}
                menuId={catalog.menu.id}
                item={item}
                media={catalog.media}
                onError={onError}
                onSaved={onSaved}
              />
            ))}
          </ul>
          <AddFlavorForm
            sectionId={section.id}
            menuId={catalog.menu.id}
            onError={onError}
            onSaved={onSaved}
          />
        </>
      ) : null}
    </section>
  );
}

function PricesEditor({
  menuId,
  tiers,
  onError,
  onSaved,
}: {
  menuId: string;
  tiers: AdminTier[];
  onError: (error: string) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative flex flex-col gap-3">
      <BusyOverlay show={pending} label="Actualizando precios…" />
      <div className="grid gap-3 sm:grid-cols-3">
        {tiers.map((tier) => (
          <PriceField
            key={tier.id}
            menuId={menuId}
            tier={tier}
            onError={onError}
            onSaved={onSaved}
          />
        ))}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          className="text-sm font-bold text-zinc-800"
          onClick={() => {
            startTransition(async () => {
              const result = await addPriceTier(menuId);
              if (!result.ok) {
                onError(result.error ?? "No se pudo agregar.");
                return;
              }
              onSaved();
              router.refresh();
            });
          }}
        >
          Agregar precio
        </button>
      </div>
    </div>
  );
}

function HeroesEditor({
  menuId,
  heroes,
  onError,
  onSaved,
}: {
  menuId: string;
  heroes: AdminHero[];
  onError: (error: string) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative flex flex-col gap-3">
      <BusyOverlay show={pending} label="Actualizando destacados…" />
      <div className="grid gap-3 sm:grid-cols-2">
        {heroes.map((hero) => (
          <HeroCard
            key={hero.id}
            menuId={menuId}
            hero={hero}
            onError={onError}
            onSaved={onSaved}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          className="text-sm font-bold text-zinc-800"
          onClick={() => {
            startTransition(async () => {
              const result = await addHero(menuId);
              if (!result.ok) {
                onError(result.error ?? "No se pudo agregar.");
                return;
              }
              onSaved();
              router.refresh();
            });
          }}
        >
          Agregar destacado
        </button>
        <a href="/admin/media" className="text-sm font-bold text-pink-600">
          Cambiar fotos
        </a>
      </div>
    </div>
  );
}

function HeroCard({
  menuId,
  hero,
  onError,
  onSaved,
}: {
  menuId: string;
  hero: AdminHero;
  onError: (error: string) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(hero.caption ?? "");
  const [badge, setBadge] = useState(hero.badge ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <article className="relative flex gap-3 rounded-xl border border-zinc-200 p-3">
      <BusyOverlay show={pending} label="Guardando…" />
      <div className="h-16 w-16 overflow-hidden rounded-lg bg-zinc-100">
        {hero.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayMediaUrl(hero.image_url)}
            alt={hero.caption ?? hero.badge ?? ""}
            className="h-full w-full object-cover"
          />
        ) : (
          <p className="grid h-full place-items-center text-[10px] font-bold text-zinc-400">
            Ilustración
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          value={caption}
          maxLength={40}
          placeholder="Título"
          disabled={pending}
          className={fieldClass(
            `hero-caption:${hero.id}`,
            "rounded-md border border-zinc-200 px-2 py-1 text-sm font-semibold",
          )}
          onChange={(event) => setCaption(event.currentTarget.value)}
          onBlur={() => {
            if (caption.trim() === (hero.caption ?? "")) return;
            startTransition(async () => {
              const result = await updateHero(hero.id, { caption }, menuId);
              if (!result.ok) {
                onError(result.error ?? "No se pudo guardar.");
                return;
              }
              markDirty(`hero-caption:${hero.id}`);
              onSaved();
            });
          }}
        />
        <input
          value={badge}
          maxLength={40}
          placeholder="Etiqueta"
          disabled={pending}
          className={fieldClass(
            `hero-badge:${hero.id}`,
            "rounded-md border border-zinc-200 px-2 py-1 text-sm",
          )}
          onChange={(event) => setBadge(event.currentTarget.value)}
          onBlur={() => {
            if (badge.trim() === (hero.badge ?? "")) return;
            startTransition(async () => {
              const result = await updateHero(hero.id, { badge }, menuId);
              if (!result.ok) {
                onError(result.error ?? "No se pudo guardar.");
                return;
              }
              markDirty(`hero-badge:${hero.id}`);
              onSaved();
            });
          }}
        />
        <button
          type="button"
          disabled={pending}
          className="self-start text-xs font-bold text-red-600"
          onClick={() => {
            startTransition(async () => {
              const result = await deleteHero(hero.id, menuId);
              if (!result.ok) {
                onError(result.error ?? "No se pudo quitar.");
                return;
              }
              onSaved();
              router.refresh();
            });
          }}
        >
          Quitar
        </button>
      </div>
    </article>
  );
}

function PriceField({
  menuId,
  tier,
  onError,
  onSaved,
}: {
  menuId: string;
  tier: AdminTier;
  onError: (error: string) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(tier.label);
  const [value, setValue] = useState(() => overlayPriceText(tier.id, tier.price));
  const [saved, setSaved] = useState(() => overlayPriceText(tier.id, tier.price));
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-700">
      <BusyOverlay show={pending} label="Guardando…" />
      <input
        value={label}
        maxLength={24}
        disabled={pending}
        className={fieldClass(
          `tier-label:${tier.id}`,
          "rounded-md border border-zinc-200 px-2 py-1 text-xs font-bold tracking-wide",
        )}
        onChange={(event) => setLabel(event.currentTarget.value)}
        onBlur={() => {
          if (label.trim() === tier.label) return;
          startTransition(async () => {
            const result = await updateTierLabel(tier.id, label, menuId);
            if (!result.ok) {
              setLabel(tier.label);
              onError(result.error ?? "No se pudo guardar.");
              return;
            }
            markDirty(`tier-label:${tier.id}`);
            onSaved();
          });
        }}
      />
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={pending}
        className={fieldClass(
          `tier-price:${tier.id}`,
          "rounded-md border border-zinc-300 px-2 py-1.5 text-base font-bold text-zinc-900 disabled:opacity-60",
        )}
        onChange={(event) => setValue(event.currentTarget.value)}
        onBlur={() => {
          const next = parseMoney(value);
          if (next == null) {
            setValue(saved);
            onError("Precio inválido.");
            return;
          }
          const formatted = formatMoney(next);
          if (formatted === saved) {
            setValue(formatted);
            return;
          }
          startTransition(async () => {
            const result = await updateTierPrice(tier.id, next, menuId);
            if (!result.ok) {
              setValue(saved);
              onError(result.error ?? "No se pudo guardar.");
              return;
            }
            const confirmed = formatMoney(result.price ?? next);
            rememberPrice(tier.id, Number(confirmed));
            setSaved(confirmed);
            setValue(confirmed);
            onSaved();
          });
        }}
      />
      <button
        type="button"
        disabled={pending}
        className="self-start text-xs font-bold text-red-600"
        onClick={() => {
          startTransition(async () => {
            const result = await deletePriceTier(tier.id, menuId);
            if (!result.ok) {
              onError(result.error ?? "No se pudo quitar.");
              return;
            }
            onSaved();
            router.refresh();
          });
        }}
      >
        Quitar
      </button>
    </div>
  );
}

function FlavorRow({
  menuId,
  item,
  media,
  onError,
  onSaved,
}: {
  menuId: string;
  item: AdminItem;
  media: AdminMedia[];
  onError: (error: string) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(() => overlayName(item.id, item.name));
  const [savedName, setSavedName] = useState(() => overlayName(item.id, item.name));
  const [description, setDescription] = useState(() => overlayDescription(item.id, item.description));
  const [priceText, setPriceText] = useState(() => overlayItemPriceText(item.id, item.price));
  const [available, setAvailable] = useState(() => overlayAvailable(item.id, item.is_available));
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const unused = media.filter(
    (asset) => !item.images.some((image) => image.mediaId === asset.id),
  );

  return (
    <li className="relative flex flex-col gap-2 rounded-lg border border-zinc-100 p-2">
      <BusyOverlay show={pending} label="Guardando…" />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={available}
          disabled={pending}
          title="Disponible"
          className={fieldClass(`item-available:${item.id}`, "h-4 w-4")}
          onChange={(event) => {
            const next = event.currentTarget.checked;
            const previous = available;
            setAvailable(next);
            startTransition(async () => {
              const result = await updateMenuItem(item.id, { is_available: next }, menuId);
              if (!result.ok) {
                setAvailable(previous);
                onError(result.error ?? "No se pudo guardar.");
                return;
              }
              rememberAvailable(item.id, next);
              onSaved();
            });
          }}
        />
        <input
          type="text"
          value={name}
          maxLength={40}
          disabled={pending}
          className={fieldClass(
            `item-name:${item.id}`,
            "min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-1.5 text-sm font-semibold text-zinc-900 disabled:opacity-60",
          )}
          onChange={(event) => setName(event.currentTarget.value)}
          onBlur={() => {
            const next = name.trim();
            if (next.length < 2) {
              setName(savedName);
              onError("El nombre debe tener entre 2 y 40 caracteres.");
              return;
            }
            if (next === savedName) {
              setName(savedName);
              return;
            }
            startTransition(async () => {
              const result = await updateMenuItem(item.id, { name: next }, menuId);
              if (!result.ok) {
                setName(savedName);
                onError(result.error ?? "No se pudo guardar.");
                return;
              }
              rememberName(item.id, next);
              setSavedName(next);
              setName(next);
              onSaved();
            });
          }}
        />
        <button
          type="button"
          disabled={pending}
          className="text-xs font-bold text-red-600"
          onClick={() => {
            startTransition(async () => {
              const result = await deleteMenuItem(item.id, menuId);
              if (!result.ok) {
                onError(result.error ?? "No se pudo guardar.");
                return;
              }
              rememberRemovedItem(item.id);
              onSaved();
            });
          }}
        >
          Quitar
        </button>
      </div>
      <div className="grid gap-2 pl-6 sm:grid-cols-[1fr_120px]">
        <input
          value={description}
          maxLength={120}
          placeholder="Descripción (opcional)"
          disabled={pending}
          className={fieldClass(
            `item-description:${item.id}`,
            "rounded-md border border-zinc-200 px-2 py-1.5 text-sm text-zinc-800",
          )}
          onChange={(event) => setDescription(event.currentTarget.value)}
          onBlur={() => {
            const next = description.trim();
            if (next === (item.description ?? "")) return;
            startTransition(async () => {
              const result = await updateMenuItem(item.id, { description: next || null }, menuId);
              if (!result.ok) {
                setDescription(item.description ?? "");
                onError(result.error ?? "No se pudo guardar.");
                return;
              }
              rememberDescription(item.id, next);
              onSaved();
            });
          }}
        />
        <input
          type="text"
          inputMode="decimal"
          value={priceText}
          placeholder="Precio"
          disabled={pending}
          className={fieldClass(
            `item-price:${item.id}`,
            "rounded-md border border-zinc-200 px-2 py-1.5 text-sm font-semibold",
          )}
          onChange={(event) => setPriceText(event.currentTarget.value)}
          onBlur={() => {
            const parsed = parseOptionalMoney(priceText);
            if (!parsed.ok) {
              setPriceText(overlayItemPriceText(item.id, item.price));
              onError("Precio inválido.");
              return;
            }
            const current = item.price;
            if (parsed.value == null && current == null) {
              setPriceText("");
              return;
            }
            if (parsed.value != null && current != null && formatMoney(parsed.value) === formatMoney(current)) {
              setPriceText(formatMoney(parsed.value));
              return;
            }
            startTransition(async () => {
              const result = await updateMenuItem(item.id, { price: parsed.value }, menuId);
              if (!result.ok) {
                setPriceText(overlayItemPriceText(item.id, item.price));
                onError(result.error ?? "No se pudo guardar.");
                return;
              }
              rememberItemPrice(item.id, parsed.value);
              setPriceText(parsed.value == null ? "" : formatMoney(parsed.value));
              onSaved();
            });
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-6">
        {item.images.map((image) => (
          <span key={image.id} className="relative h-12 w-12 overflow-hidden rounded-md bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayMediaUrl(image.url)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              disabled={pending}
              className="absolute right-0 top-0 bg-black/70 px-1 text-[10px] font-bold text-white"
              onClick={() => {
                startTransition(async () => {
                  const result = await removeItemMedia(item.id, image.id);
                  if (!result.ok) {
                    onError(result.error ?? "No se pudo quitar.");
                    return;
                  }
                  onSaved();
                  markDirty(`item-media:${item.id}`);
                  router.refresh();
                });
              }}
            >
              ×
            </button>
          </span>
        ))}
        {unused.length ? (
          <select
            disabled={pending || item.images.length >= 8}
            className={fieldClass(
              `item-media:${item.id}`,
              "rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700",
            )}
            defaultValue=""
            onChange={(event) => {
              const mediaId = event.currentTarget.value;
              event.currentTarget.value = "";
              if (!mediaId) return;
              startTransition(async () => {
                const result = await assignMediaToItem(item.id, mediaId);
                if (!result.ok) {
                  onError(result.error ?? "No se pudo asignar.");
                  return;
                }
                markDirty(`item-media:${item.id}`);
                onSaved();
                router.refresh();
              });
            }}
          >
            <option value="">Añadir foto…</option>
            {unused.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.alt || "Foto"}
              </option>
            ))}
          </select>
        ) : (
          <a href="/admin/media" className="text-xs font-bold text-pink-600">
            Subir fotos
          </a>
        )}
      </div>
    </li>
  );
}

function AddFlavorForm({
  sectionId,
  menuId,
  onError,
  onSaved,
}: {
  sectionId: string;
  menuId: string;
  onError: (error: string) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="relative mt-4 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const label = name.trim();
        startTransition(async () => {
          const result = await addMenuItem(sectionId, label, menuId);
          if (!result.ok) {
            onError(result.error);
            return;
          }
          rememberAddedItem(sectionId, result.item);
          setName("");
          onSaved();
        });
      }}
    >
      <BusyOverlay show={pending} label="Agregando…" />
      <input
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        placeholder="Nuevo producto"
        maxLength={40}
        disabled={pending}
        className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-60"
      >
        Agregar
      </button>
    </form>
  );
}
