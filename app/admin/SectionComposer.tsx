"use client";

import {
  addLayoutSection,
  addMenuSection,
  deleteLayoutSection,
  deleteMenuSection,
  renameLayoutSection,
  updateLayoutPlan,
  updateMenuSection,
} from "@/app/admin/actions";
import { ListIconButton, ListIconPicker } from "@/app/admin/ListIconPicker";
import { ListHeaderGlyph } from "@/components/display/icons";
import { BusyOverlay } from "@/app/admin/ui";
import type { AdminSection } from "@/lib/menu/catalog";
import type { StageOrientation } from "@/lib/display/stage";
import {
  fieldClass,
  rememberAddedSection,
  rememberLayoutPlan,
  rememberRemovedSection,
  rememberSectionColumns,
  rememberSectionComponent,
  rememberSectionIcon,
  rememberSectionName,
} from "@/lib/menu/form-draft";
import { asListIcon, defaultListIcon, type ListIcon } from "@/lib/menu/list-icons";
import {
  componentsForSection,
  ensureLayoutPlan,
  moveComponentInPlan,
  reorderPlanSections,
  unplacedComponents,
  type LayoutPlanSection,
} from "@/lib/menu/layout-plan";
import {
  SECTION_COMPONENTS,
  asSectionComponent,
  labelForComponent,
} from "@/lib/menu/sections";
import { useEffect, useState, useTransition } from "react";

type DragPayload =
  | { kind: "component"; id: string }
  | { kind: "section"; id: string };

export function SectionComposer({
  menuId,
  sections,
  layoutSections,
  orientation = "landscape",
  onError,
  onSaved,
  onBusy,
}: {
  menuId: string;
  sections: AdminSection[];
  layoutSections: LayoutPlanSection[];
  orientation?: StageOrientation;
  onError: (error: string) => void;
  onSaved: () => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [rows, setRows] = useState(sections);
  const [bands, setBands] = useState(() =>
    ensureLayoutPlan(
      sections.map((section) => section.id),
      layoutSections,
    ),
  );
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | "all" | null>(null);
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({});
  const [bandDraft, setBandDraft] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [targetSectionId, setTargetSectionId] = useState("");
  const [listDraft, setListDraft] = useState<{ sectionId: string } | null>(null);
  const [listName, setListName] = useState("");
  const [listIcon, setListIcon] = useState<ListIcon>("ice-cream");
  const [iconPickerId, setIconPickerId] = useState<string | null>(null);
  const portrait = orientation === "portrait";
  const loose = unplacedComponents(rows, bands);

  useEffect(() => {
    setRows(sections);
    setBands(ensureLayoutPlan(sections.map((section) => section.id), layoutSections));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identity changes every parent render
  }, [menuId]);

  useEffect(() => {
    if (targetSectionId && !bands.some((band) => band.id === targetSectionId)) {
      setTargetSectionId("");
    }
  }, [bands, targetSectionId]);

  useEffect(() => {
    onBusy?.(pending);
  }, [pending, onBusy]);

  function run(
    action: () => Promise<{
      ok: boolean;
      error?: string;
      section?: AdminSection;
      layoutSections?: LayoutPlanSection[];
    }>,
    options?: {
      optimisticRows?: (current: AdminSection[]) => AdminSection[];
      optimisticBands?: (current: LayoutPlanSection[]) => LayoutPlanSection[];
      busy?: string | "all";
    },
  ) {
    const previousRows = rows;
    const previousBands = bands;
    if (options?.optimisticRows) setRows(options.optimisticRows(rows));
    if (options?.optimisticBands) {
      const next = options.optimisticBands(bands);
      setBands(next);
      rememberLayoutPlan(next);
    }
    setBusyId(options?.busy ?? "all");
    startTransition(async () => {
      const result = await action();
      setBusyId(null);
      if (!result.ok) {
        setRows(previousRows);
        setBands(previousBands);
        rememberLayoutPlan(previousBands);
        onError(result.error ?? "No se pudo guardar.");
        return;
      }
      if (result.layoutSections) {
        setBands(result.layoutSections);
        rememberLayoutPlan(result.layoutSections);
      }
      if (result.section) {
        rememberAddedSection(result.section);
        setRows((current) =>
          current.some((row) => row.id === result.section!.id)
            ? current
            : [...current, result.section!],
        );
      }
      onSaved();
    });
  }

  function persistPlan(next: LayoutPlanSection[]) {
    run(() => updateLayoutPlan(next, menuId), {
      busy: "all",
      optimisticBands: () => next,
    });
  }

  function addComponentTo(component: string, sectionId: string) {
    if (!component || !sectionId) return;
    if (component === "products") {
      setListDraft({ sectionId });
      setListName("");
      setListIcon("ice-cream");
      return;
    }
    run(() => addMenuSection(component, menuId, sectionId), { busy: "all" });
  }

  function submitListDraft() {
    if (!listDraft) return;
    const name = listName.trim();
    if (name.length < 2 || name.length > 40) {
      onError("El nombre debe tener entre 2 y 40 caracteres.");
      return;
    }
    const sectionId = listDraft.sectionId;
    const icon = listIcon;
    setListDraft(null);
    run(() => addMenuSection("products", menuId, sectionId, { name, icon }), { busy: "all" });
  }

  function changeListIcon(section: AdminSection, icon: ListIcon) {
    setIconPickerId(null);
    run(
      async () => {
        const result = await updateMenuSection(section.id, { icon }, menuId);
        if (result.ok) {
          rememberSectionIcon(section.id, icon);
          setRows((current) =>
            current.map((row) =>
              row.id === section.id
                ? {
                    ...row,
                    headerIcon: icon,
                    kind: icon === "water" ? "agua" : icon === "milk" ? "leche" : row.kind,
                  }
                : row,
            ),
          );
        }
        return result;
      },
      { busy: section.id },
    );
  }

  function onDropComponent(targetSectionId: string, targetIndex?: number) {
    if (dragging?.kind !== "component") return;
    persistPlan(moveComponentInPlan(bands, dragging.id, targetSectionId, targetIndex));
    setDragging(null);
    setOverId(null);
  }

  function onDropSection(targetSectionId: string) {
    if (dragging?.kind !== "section") return;
    persistPlan(reorderPlanSections(bands, dragging.id, targetSectionId));
    setDragging(null);
    setOverId(null);
  }

  return (
    <section className="relative rounded-2xl border border-zinc-200 bg-white p-5">
      <BusyOverlay show={pending && busyId === "all"} label="Actualizando secciones…" />
      {listDraft ? (
        <div
          className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-white/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-list-title"
        >
          <form
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg"
            onSubmit={(event) => {
              event.preventDefault();
              submitListDraft();
            }}
          >
            <h3 id="new-list-title" className="text-sm font-bold tracking-wide text-zinc-800">
              NUEVA LISTA
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Escribe el nombre que se verá en el encabezado y elige un icono.
            </p>
            <label className="mt-4 block text-sm font-semibold text-zinc-700">
              Nombre de la lista
              <input
                autoFocus
                value={listName}
                maxLength={40}
                placeholder="Ej. NIEVES DE AGUA"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold"
                onChange={(event) => setListName(event.currentTarget.value)}
              />
            </label>
            <p className="mt-4 text-sm font-semibold text-zinc-700">Icono del encabezado</p>
            <div className="mt-2 max-h-56 overflow-y-auto pr-1">
              <ListIconPicker value={listIcon} onChange={setListIcon} disabled={pending} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-bold text-zinc-700"
                onClick={() => setListDraft(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Agregar lista
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-wide text-zinc-500">SECCIONES DE LA PANTALLA</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Cada sección es una {portrait ? "fila" : "columna"}. Solo se muestran en pantalla
            los componentes que coloques en una sección.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold tracking-wide text-zinc-600">
            {portrait ? "RETRATO · FILAS" : "PAISAJE · COLUMNAS"}
          </span>
          <button
            type="button"
            disabled={pending}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-bold text-zinc-800 disabled:opacity-50"
            onClick={() => run(() => addLayoutSection(menuId), { busy: "all" })}
          >
            Agregar sección
          </button>
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            En
            <select
              disabled={pending || !bands.length}
              value={targetSectionId}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5"
              onChange={(event) => setTargetSectionId(event.currentTarget.value)}
            >
              <option value="">{bands.length ? "Elegir sección…" : "Sin secciones"}</option>
              {bands.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            Componente
            <select
              disabled={pending || !targetSectionId}
              defaultValue=""
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 disabled:opacity-50"
              onChange={(event) => {
                const component = event.currentTarget.value;
                event.currentTarget.value = "";
                if (!component) return;
                addComponentTo(component, targetSectionId);
              }}
            >
              <option value="">Agregar…</option>
              {SECTION_COMPONENTS.map((component) => (
                <option key={component.key} value={component.key}>
                  {component.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loose.length ? (
        <div
          className="mt-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-3"
          onDragOver={(event) => {
            event.preventDefault();
            setOverId("unplaced");
          }}
          onDragLeave={() => {
            setOverId((current) => (current === "unplaced" ? null : current));
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (dragging?.kind !== "component") return;
            persistPlan(
              bands.map((band) => ({
                ...band,
                componentIds: band.componentIds.filter((id) => id !== dragging.id),
              })),
            );
            setDragging(null);
            setOverId(null);
          }}
        >
          <p className="text-xs font-bold tracking-wide text-amber-800">
            EN EL MENÚ · SIN COLOCAR EN EL TABLERO
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {loose.map((section) => (
              <article
                key={section.id}
                draggable
                onDragStart={() => setDragging({ kind: "component", id: section.id })}
                onDragEnd={() => {
                  setDragging(null);
                  setOverId(null);
                }}
                className="flex cursor-grab items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm active:cursor-grabbing"
              >
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold tracking-wide text-amber-800">
                  {labelForComponent(asSectionComponent(section.component))}
                </span>
                {asSectionComponent(section.component) === "products" ? (
                  <ListHeaderGlyph
                    icon={asListIcon(section.headerIcon, defaultListIcon(section.kind))}
                    className="h-4 w-4 text-amber-800"
                  />
                ) : null}
                {section.name}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!bands.length ? (
        <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm font-semibold text-zinc-500">
          No hay secciones. Agrega una sección y luego elige dónde colocar cada componente.
        </p>
      ) : null}

      <div
        className={`mt-4 gap-3 ${
          portrait ? "flex flex-col" : "grid sm:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {bands.map((band) => {
          const items = componentsForSection(rows, band);
          const highlighted = overId === band.id;
          return (
            <div
              key={band.id}
              className={`relative flex min-h-[140px] flex-col rounded-2xl border-2 border-dashed p-3 transition-colors ${
                highlighted ? "border-pink-400 bg-pink-50" : "border-zinc-200 bg-zinc-50"
              } ${portrait ? "w-full" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setOverId(band.id);
              }}
              onDragLeave={() => {
                setOverId((current) => (current === band.id ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging?.kind === "section") onDropSection(band.id);
                else onDropComponent(band.id);
              }}
            >
              <div
                className="mb-2 flex cursor-grab items-center gap-2 active:cursor-grabbing"
                draggable
                onDragStart={() => setDragging({ kind: "section", id: band.id })}
                onDragEnd={() => {
                  setDragging(null);
                  setOverId(null);
                }}
              >
                <span className="text-zinc-400" aria-hidden>
                  ⋮⋮
                </span>
                <input
                  value={bandDraft[band.id] ?? band.name}
                  maxLength={40}
                  disabled={pending}
                  className={fieldClass(
                    `layout-section:${band.id}`,
                    "min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm font-bold",
                  )}
                  onMouseDown={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    setBandDraft((current) => ({ ...current, [band.id]: event.target.value }))
                  }
                  onBlur={() => {
                    const next = (bandDraft[band.id] ?? band.name).trim();
                    if (next === band.name) return;
                    run(() => renameLayoutSection(band.id, next, menuId), { busy: band.id });
                  }}
                />
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs font-bold text-red-600 disabled:opacity-30"
                  onClick={() => run(() => deleteLayoutSection(band.id, menuId), { busy: band.id })}
                >
                  Quitar
                </button>
              </div>

              <div
                className={`flex min-h-[72px] flex-1 gap-2 ${
                  portrait ? "flex-col" : "flex-row flex-wrap"
                }`}
              >
                {items.map((section, index) => {
                  const component = asSectionComponent(section.component);
                  const headerIcon = asListIcon(
                    section.headerIcon,
                    defaultListIcon(section.kind),
                  );
                  return (
                    <article
                      key={section.id}
                      draggable
                      onDragStart={() => setDragging({ kind: "component", id: section.id })}
                      onDragEnd={() => {
                        setDragging(null);
                        setOverId(null);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDropComponent(band.id, index);
                      }}
                      className={`relative flex cursor-grab flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm active:cursor-grabbing ${
                        portrait ? "w-full" : "min-w-[220px] flex-1"
                      }`}
                    >
                      <BusyOverlay show={pending && busyId === section.id} label="Guardando…" />
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold tracking-wide text-zinc-600">
                        {labelForComponent(component)}
                      </span>
                      {component === "products" ? (
                        <ListIconButton
                          value={headerIcon}
                          title="Icono de la lista"
                          disabled={pending}
                          onClick={() =>
                            setIconPickerId((current) =>
                              current === section.id ? null : section.id,
                            )
                          }
                        />
                      ) : null}
                      <input
                        value={nameDraft[section.id] ?? section.name}
                        maxLength={40}
                        disabled={pending}
                        className={fieldClass(
                          `section-name:${section.id}`,
                          "min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-1.5 text-sm font-semibold",
                        )}
                        onMouseDown={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          setNameDraft((current) => ({
                            ...current,
                            [section.id]: event.target.value,
                          }))
                        }
                        onBlur={() => {
                          const next = (nameDraft[section.id] ?? section.name).trim();
                          if (next === section.name) return;
                          run(
                            async () => {
                              const result = await updateMenuSection(
                                section.id,
                                { name: next },
                                menuId,
                              );
                              if (result.ok) {
                                rememberSectionName(section.id, next);
                                setRows((current) =>
                                  current.map((row) =>
                                    row.id === section.id ? { ...row, name: next } : row,
                                  ),
                                );
                              }
                              return result;
                            },
                            { busy: section.id },
                          );
                        }}
                      />
                      <select
                        value={component}
                        disabled={pending}
                        className={fieldClass(
                          `section-component:${section.id}`,
                          "rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-semibold",
                        )}
                        onChange={(event) => {
                          const next = event.currentTarget.value;
                          run(
                            async () => {
                              const result = await updateMenuSection(
                                section.id,
                                { component: next },
                                menuId,
                              );
                              if (result.ok) {
                                rememberSectionComponent(section.id, next);
                                setRows((current) =>
                                  current.map((row) =>
                                    row.id === section.id ? { ...row, component: next } : row,
                                  ),
                                );
                              }
                              return result;
                            },
                            {
                              busy: section.id,
                              optimisticRows: (current) =>
                                current.map((row) =>
                                  row.id === section.id ? { ...row, component: next } : row,
                                ),
                            },
                          );
                        }}
                      >
                        {SECTION_COMPONENTS.map((entry) => (
                          <option key={entry.key} value={entry.key}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                      {isProductComponentSafe(component) ? (
                        <select
                          value={section.columns}
                          disabled={pending}
                          title="Columnas"
                          className={fieldClass(
                            `section-columns:${section.id}`,
                            "rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-semibold",
                          )}
                          onChange={(event) => {
                            const next = Number(event.currentTarget.value);
                            run(
                              async () => {
                                const result = await updateMenuSection(
                                  section.id,
                                  { columns: next },
                                  menuId,
                                );
                                if (result.ok) {
                                  rememberSectionColumns(section.id, next);
                                  setRows((current) =>
                                    current.map((row) =>
                                      row.id === section.id ? { ...row, columns: next } : row,
                                    ),
                                  );
                                }
                                return result;
                              },
                              {
                                busy: section.id,
                                optimisticRows: (current) =>
                                  current.map((row) =>
                                    row.id === section.id ? { ...row, columns: next } : row,
                                  ),
                              },
                            );
                          }}
                        >
                          <option value={1}>1 col</option>
                          <option value={2}>2 cols</option>
                          <option value={3}>3 cols</option>
                        </select>
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        className="text-xs font-bold text-red-600"
                        onClick={() =>
                          run(
                            async () => {
                              const result = await deleteMenuSection(section.id, menuId);
                              if (result.ok) rememberRemovedSection(section.id);
                              return result;
                            },
                            {
                              busy: section.id,
                              optimisticRows: (current) =>
                                current.filter((row) => row.id !== section.id),
                              optimisticBands: (current) =>
                                current.map((item) => ({
                                  ...item,
                                  componentIds: item.componentIds.filter((id) => id !== section.id),
                                })),
                            },
                          )
                        }
                      >
                        Quitar
                      </button>
                      {component === "products" && iconPickerId === section.id ? (
                        <div
                          className="basis-full pt-2"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <ListIconPicker
                            value={headerIcon}
                            disabled={pending}
                            onChange={(icon) => changeListIcon(section, icon)}
                          />
                        </div>
                      ) : null}
                    </article>
                  );
                })}
                {!items.length ? (
                  <p className="self-center px-2 text-sm font-semibold text-zinc-400">
                    Suelta un componente aquí
                  </p>
                ) : null}
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-zinc-600">
                Agregar aquí
                <select
                  disabled={pending}
                  defaultValue=""
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-semibold"
                  onChange={(event) => {
                    const component = event.currentTarget.value;
                    event.currentTarget.value = "";
                    if (!component) return;
                    addComponentTo(component, band.id);
                  }}
                >
                  <option value="">Componente…</option>
                  {SECTION_COMPONENTS.map((entry) => (
                    <option key={entry.key} value={entry.key}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function isProductComponentSafe(component: string) {
  return component === "products" || component === "carousel" || component === "promo";
}
