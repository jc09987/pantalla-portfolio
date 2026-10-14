"use client";

import { ListHeaderGlyph } from "@/components/display/icons";
import { LIST_ICONS, type ListIcon } from "@/lib/menu/list-icons";

export function ListIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: ListIcon;
  onChange: (icon: ListIcon) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
      {LIST_ICONS.map((icon) => {
        const selected = value === icon.key;
        return (
          <button
            type="button"
            key={icon.key}
            disabled={disabled}
            title={icon.name}
            className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-bold leading-tight disabled:opacity-50 ${
              selected
                ? "border-pink-500 bg-pink-50 text-pink-800"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
            }`}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => onChange(icon.key)}
          >
            <ListHeaderGlyph icon={icon.key} className="h-6 w-6" />
            {icon.name}
          </button>
        );
      })}
    </div>
  );
}

export function ListIconButton({
  value,
  title,
  disabled,
  onClick,
}: {
  value: ListIcon;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title ?? "Icono"}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700 disabled:opacity-50"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      <ListHeaderGlyph icon={value} className="h-5 w-5" />
    </button>
  );
}
