"use client";

export function AdminSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <span className={`admin-spinner admin-spinner-${size}`} aria-hidden />;
}

export function BusyOverlay({
  show,
  label = "Guardando…",
  cover = "local",
}: {
  show: boolean;
  label?: string;
  cover?: "local" | "page";
}) {
  if (!show) return null;
  return (
    <div
      className={`admin-busy-overlay ${cover === "page" ? "admin-busy-overlay-page" : ""}`}
      role="status"
      aria-live="polite"
    >
      <AdminSpinner size={cover === "page" ? "lg" : "md"} />
      <p>{label}</p>
    </div>
  );
}

export function AdminLoadingScreen({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-6 py-16">
      <div className="flex flex-col items-center gap-3">
        <AdminSpinner size="lg" />
        <p className="text-sm font-bold text-zinc-500">{label}</p>
      </div>
    </div>
  );
}
